from Crypto.Util.number import bytes_to_long, getPrime

p = getPrime(1024)
e = 65537

FLAG = open("flag.txt", "rb").read()
m1 = pow(bytes_to_long(FLAG[:len(FLAG)//2]), e, p)
m2 = pow(bytes_to_long(FLAG[len(FLAG)//2:]), e, p)

res1 = (13 * m2 ** 2 + m1 * m2 + 5 * m1) % p
res2 = (7 * m2 + m1 ** 2) % p

print("Lampent challenges you...")
print("p =", p)
print("res1 =", res1)
print("res2 =", res2)


# Challenge: Lampent
# Original: equation-2 from Grey Cat the Flag 2022
# Author: mechfrog88
# Source: https://github.com/NUSGreyhats/greyctf-2022-public/tree/main/challenges/crypto/equation-2/dist
# Description: Equation solving in a finite field and finding the roots of a univariate polynomial modulo p.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/lampent
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/608.png
# Tags: ["algc:Others", "method:MathEq"]
