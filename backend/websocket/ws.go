package websocket

import (
	"bufio"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
)

const websocketGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

type Conn struct {
	rwc    net.Conn
	bufr   *bufio.Reader
	writeMu sync.Mutex
	isClosed bool
}

func Upgrade(w http.ResponseWriter, r *http.Request) (*Conn, error) {
	if strings.ToLower(r.Header.Get("Upgrade")) != "websocket" {
		return nil, errors.New("not a websocket handshake: missing Upgrade")
	}
	if !strings.Contains(strings.ToLower(r.Header.Get("Connection")), "upgrade") {
		return nil, errors.New("not a websocket handshake: missing Connection: Upgrade")
	}
	key := r.Header.Get("Sec-WebSocket-Key")
	if key == "" {
		return nil, errors.New("missing Sec-WebSocket-Key")
	}

	h := sha1.New()
	h.Write([]byte(key + websocketGUID))
	acceptKey := base64.StdEncoding.EncodeToString(h.Sum(nil))

	hj, ok := w.(http.Hijacker)
	if !ok {
		return nil, errors.New("server does not support hijacking")
	}

	netConn, bufrw, err := hj.Hijack()
	if err != nil {
		return nil, err
	}

	resp := "HTTP/1.1 101 Switching Protocols\r\n" +
		"Upgrade: websocket\r\n" +
		"Connection: Upgrade\r\n" +
		"Sec-WebSocket-Accept: " + acceptKey + "\r\n\r\n"

	if _, err := bufrw.WriteString(resp); err != nil {
		netConn.Close()
		return nil, err
	}
	if err := bufrw.Flush(); err != nil {
		netConn.Close()
		return nil, err
	}

	return &Conn{
		rwc:  netConn,
		bufr: bufrw.Reader,
	}, nil
}

func (c *Conn) Close() error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	if c.isClosed {
		return nil
	}
	c.isClosed = true
	return c.rwc.Close()
}

func (c *Conn) WriteTextMessage(data []byte) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	if c.isClosed {
		return errors.New("connection closed")
	}

	// Opcode 1 for text frame, FIN bit set (0x81)
	header := []byte{0x81}
	length := len(data)

	if length <= 125 {
		header = append(header, byte(length))
	} else if length <= 65535 {
		header = append(header, 126)
		lenBytes := make([]byte, 2)
		binary.BigEndian.PutUint16(lenBytes, uint16(length))
		header = append(header, lenBytes...)
	} else {
		header = append(header, 127)
		lenBytes := make([]byte, 8)
		binary.BigEndian.PutUint64(lenBytes, uint64(length))
		header = append(header, lenBytes...)
	}

	if _, err := c.rwc.Write(header); err != nil {
		return err
	}
	_, err := c.rwc.Write(data)
	return err
}

func (c *Conn) ReadTextMessage() ([]byte, error) {
	for {
		b1, err := c.bufr.ReadByte()
		if err != nil {
			return nil, err
		}
		// fin := (b1 & 0x80) != 0
		opcode := b1 & 0x0F

		b2, err := c.bufr.ReadByte()
		if err != nil {
			return nil, err
		}
		masked := (b2 & 0x80) != 0
		payloadLen := uint64(b2 & 0x7F)

		if payloadLen == 126 {
			var extLen uint16
			if err := binary.Read(c.bufr, binary.BigEndian, &extLen); err != nil {
				return nil, err
			}
			payloadLen = uint64(extLen)
		} else if payloadLen == 127 {
			var extLen uint64
			if err := binary.Read(c.bufr, binary.BigEndian, &extLen); err != nil {
				return nil, err
			}
			payloadLen = extLen
		}

		var maskKey [4]byte
		if masked {
			if _, err := io.ReadFull(c.bufr, maskKey[:]); err != nil {
				return nil, err
			}
		}

		payload := make([]byte, payloadLen)
		if _, err := io.ReadFull(c.bufr, payload); err != nil {
			return nil, err
		}

		if masked {
			for i := uint64(0); i < payloadLen; i++ {
				payload[i] ^= maskKey[i%4]
			}
		}

		// Handle close frame (opcode 8)
		if opcode == 8 {
			c.Close()
			return nil, errors.New("client sent close frame")
		}

		// Handle ping frame (opcode 9) -> reply with pong (opcode 10)
		if opcode == 9 {
			c.writeMu.Lock()
			// Pong frame header 0x8A
			pong := []byte{0x8A, byte(len(payload))}
			c.rwc.Write(pong)
			c.rwc.Write(payload)
			c.writeMu.Unlock()
			continue
		}

		// Opcode 1 is text
		if opcode == 1 {
			return payload, nil
		}

		// Opcode 2 is binary
		if opcode == 2 {
			return payload, nil
		}

		// Ignore other control frames or continue loop
	}
}
