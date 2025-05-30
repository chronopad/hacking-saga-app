from pwn import *
from string import printable

def repeating_xor(ct, key):
    res = [ct[i] ^ key[i % len(key)] for i in range(len(ct))]
    return bytes(res)

def send_to_oracle(m):
    io.sendlineafter(b"Spinda wants plaintext: ", m.hex().encode())
    io.recvuntil(b"Spinda gives ciphertext: ")
    return bytes.fromhex(io.recvline().decode())

io = process(["python3", "chall.py"])
io.recvuntil(b"Spinda gives special ciphertext: ")
ct = bytes.fromhex(io.recvline().decode())

total_block = len(ct) // 16 - 1
for char in string.printable:
    # block_4 = char.encode() + b"}"
    # dec_block = send_to_oracle(block_4)
    # block_3 = repeating_xor(ct[64:80], repeating_xor(dec_block[:16], dec_block[16:]))

    # dec_block = send_to_oracle(block_3)
    # block_2 = repeating_xor(ct[48:64], repeating_xor(dec_block[:16], dec_block[16:]))

    # dec_block = send_to_oracle(block_2)
    # block_1 = repeating_xor(ct[32:48], repeating_xor(dec_block[:16], dec_block[16:]))
    # flag = block_1 + block_2 + block_3 + block_4

    guess = char.encode() + b"}"
    res = [guess]
    for i in range(total_block - 1):
        dec_block = send_to_oracle(res[i])
        res.append(repeating_xor(ct[16*(total_block - i):16*(total_block + 1 - i)], repeating_xor(dec_block[:16], dec_block[16:])))

    flag = b"".join(res[::-1])
    if b"chrono{" in flag:
        print("Flag:", flag.decode())
        break
