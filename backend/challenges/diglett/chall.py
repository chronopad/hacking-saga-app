from Crypto.Util.number import bytes_to_long

FLAG = open("flag.txt", "rb").read()
flag_length = len(FLAG)

m1 = bytes_to_long(FLAG[:len(FLAG)//2])
m2 = bytes_to_long(FLAG[len(FLAG)//2:])
print(13 * m2 ** 2 + m1 * m2 + 5 * m1 ** 7)
print(7 * m2 ** 3 + m1 ** 5)


# Challenge: Diglett
# Original: equations from Grey Cat the Flag 2022
# Author: mechfrog88
# Source: https://github.com/NUSGreyhats/greyctf-2022-public/tree/main/challenges/crypto/equation/dist
# Description: Equation solving via the resultant method.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/diglett
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/50.png
# Tags: ["algc:Others", "method:MathEq"]
