import secrets

p = 0x31337313373133731337313373133731337313373133731337313373133732ad
a = 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef
b = 0xdeadc0dedeadc0dedeadc0dedeadc0dedeadc0dedeadc0dedeadc0dedeadc0de

def lcg(x, a, b):
    while True:
        yield (x := a*x + b)

flag = open('flag.txt', 'rb').read()
x = int.from_bytes(flag + secrets.token_bytes(30-len(flag)), 'big')
gen = lcg(x, a, b)

h1 = next(gen) * pow(next(gen), -1, p) % p
h2 = next(gen) * pow(next(gen), -1, p) % p

trunc = 48
print("Bagon challenges you...")
print(f'res1 = {h1 >> trunc}')
print(f'res2 = {h2 >> trunc}')


# Challenge: Bagon
# Original: Copperbox from HTB Cyber Apocalypse 2025
# Author: Blupper
# Source: https://app.hackthebox.com/challenges/Copperbox
# Description: Truncated LCG state recovery via bivariate Coppersmith method.
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/bagon
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/371.png
# Tags: ["prng:LCG", "method:Coppersmith", "addt:Bivariate"]
