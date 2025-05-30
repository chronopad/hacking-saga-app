from Crypto.Util.number import isPrime, long_to_bytes
from pwn import *

def send_to_oracle(m):
    m = hex(m)[2:]
    if len(m) % 2 == 1:
        m = m.zfill(len(m) + 1)

    io.sendlineafter(b"> ", b"2")
    io.sendlineafter(b": ", m.encode())
    io.recvuntil(b": ")

    return int(io.recvline().decode())

def stateBitGen(x, M):
    while True:
        x = pow(x, 2, M)
        yield x % 2

io = process(["python3", "chall.py"])
context.log_level = "debug"

io.recvuntil(b"M = ")
M = int(io.recvline().decode())

io.sendlineafter(b"> ", b"1")
io.recvuntil(b"n = ")
n = int(io.recvline().decode())
io.recvuntil(b": ")
c = int(io.recvline().decode())

print("M =", M)
print("n =", n)
print("c =", c)

MAX_ITER = 50
context.log_level = "info"
x0_bits = []
for i in range(MAX_ITER):
    x0_bits.append(int(not send_to_oracle(1)))
print(x0_bits)

possible_primes = []
for i in range(2**14, 2**15-1):
    if isPrime(i):
        possible_primes.append(i)

valid_x0s = []
for valid_prime in possible_primes:
    x = valid_prime
    res_x0_bits = []
    for i in range(MAX_ITER):
        x = pow(x, 2, M)
        res_x0_bits.append(x % 2)
    if res_x0_bits == x0_bits:
        print("x0 =", valid_prime)
        valid_x0s.append(valid_prime)

if len(valid_x0s) != 1:
    print("Restart: requires only one x0!")
    exit()

bitgen = stateBitGen(valid_x0s[0], M)
for i in range(MAX_ITER):
    next(bitgen)

nextbits = []
for i in range(10):
    nextbits.append(next(bitgen))

x0_bits = []
for i in range(10):
    x0_bits.append(int(not send_to_oracle(1)))
print("Bits aligned:", nextbits == x0_bits)

e = 65537
upper_limit = n
lower_limit = 0

i = 0
while lower_limit < upper_limit:
    if next(bitgen):
        res = send_to_oracle(c * pow(2**i, e, n) % n)
    else:
        res = send_to_oracle(c * pow(2**(i+1), e, n) % n)

    if res:
        lower_limit = (lower_limit + upper_limit)//2
    else:
        upper_limit = (upper_limit + lower_limit)//2

    i += 1
    print(i, long_to_bytes(lower_limit))

for i in range(-50, 50):
    m = lower_limit + i
    if pow(m, e, n) == c:
        print(long_to_bytes(m))
        break