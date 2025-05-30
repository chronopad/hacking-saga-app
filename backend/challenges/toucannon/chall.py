from Crypto.Util.number import *

flag = open("flag.txt", "rb").read()
m = bytes_to_long(flag)

e = 65537
p, q = getPrime(512), getPrime(512)
n = p * q
c = pow(m, e, n)

res1 = 2*(p**3)*(q**2) + 7*q*(p**7) + 5*(q**2)
res2 = p**13 + 12*p*q + 31*(q**5)*(p**3) + p

print("Toucannon challenges you...")
print("res1 =", res1)
print("res2 =", res2)
print("c =", c)


# Challenge: Toucannon
# Original: PolyDream from Imaginary CTF Round 56 (August 2024)
# Author: Rinezorid
# Source: https://imaginaryctf.org/ArchivedChallenges/56
# Description: Usage of the resultant method to solve equations by eliminating a variable.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/toucannon
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/733.png
# Tags: ["algc:Others", "method:MathEq"]
