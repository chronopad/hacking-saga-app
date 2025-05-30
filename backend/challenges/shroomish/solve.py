from pwn import *
from Crypto.Util.number import long_to_bytes

def send_to_oracle(c):
    io.sendlineafter(b"Ciphertext: ", str(c).encode())
    io.recvuntil(b"Shroomish gives one piece: ")

    return int(io.recvline().decode())

io = process(["python3", "chall.py"])
# context.log_level = "debug"
io.recvuntil(b"n = ")
n = int(io.recvline().decode())
io.recvuntil(b"c = ")
c = int(io.recvline().decode())
e = 65537

upper_limit = n
lower_limit = 0

i = 1
while i <= n.bit_length() + 10:
    if not send_to_oracle(c * pow(2**i, e, n) % n):
        upper_limit = (upper_limit + lower_limit)//2
    else:
        lower_limit = (lower_limit + upper_limit)//2
    i += 1

print(long_to_bytes(lower_limit))