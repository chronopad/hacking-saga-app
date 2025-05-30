from Crypto.Util.number import long_to_bytes
from pwn import *

def send_to_oracle(c):
    io.sendlineafter(b"Ciphertext: ", str(c).encode())
    res = io.recvline()

    if b"Carnivine refuses to decrypt..." in res:
        return 0
    return 1

io = process(["python3", "chall.py"])
io.recvuntil(b"n = ")
n = int(io.recvline().decode())
io.recvuntil(b"c = ")
c = int(io.recvline().decode())
e = 65537

print("n =", n)
print("c =", c)

max_bytes = n.bit_length() // 8
shift = 0
while shift < max_bytes:
    shift += 1
    res = send_to_oracle(c * pow(2**(8*shift), e, n) % n)
    if res:
        break 
flag_length = max_bytes - shift + 1
print("Flag length:", flag_length, max_bytes)

if flag_length <= 1:
    exit()

low = 2**(8*(max_bytes - flag_length))
high = 2**(8*(max_bytes - flag_length + 1))
while low <= high:
    mid = low + (high - low) // 2
    if send_to_oracle(c * pow(mid, e, n) % n):
        high = mid - 1
    else:
        low = mid + 1
max_num = low - 1
print("Max number: ", max_num)
print("Message: ", long_to_bytes(2**(8*max_bytes) // max_num))