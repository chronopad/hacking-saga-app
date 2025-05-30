from Crypto.Random import random
from LoakOne import LoakOne
from LoakTwo import LoakTwo
import json

FLAG = open('flag.txt', 'r').read()
p = 3711307719289846942219567023821864189758609249064872089779

class LoakRNG:
    def __init__(self, seed, P, Q):
        self.seed = seed
        self.P = P
        self.Q = Q

    def next(self):
        t = self.seed
        s = (t * self.P).x
        self.seed = s
        r = (s * self.Q).x
        return (int(r)) >> 12

send = lambda x : print(json.dumps(x))
recv = lambda : json.loads(input())

loakCoins = 5000
a1, a2, b2 = [random.randint(1, p) for i in range(3)]

E2 = LoakTwo(a2, b2)
G2 = E2.random_element()

print("Drakloak challenges you...")
print("Drakloak demands b1 and a point of E1!")
send({"a1" : a1, "a2" : a2, "b2" : b2, "Gx" : G2.x, "Gy" : G2.y})
response = recv()

b1 = response['b1']
x1, y1 = response['x'] % p, response['y'] % p

E1 = LoakOne(a1, b1)
G1 = E1(x1, y1)

if (195306067165045895827288868805553560 * G1).list() == [1, 0] or x1 == 0 or y1 == 0:
    print("Drakloak rejects the point!")
exit()

rand = LoakRNG(random.randint(1, p), G1, G2)
maxCoins = 12000

while 0 < loakCoins < maxCoins:
    nextLoak = rand.next()
response = recv()

if response['nextLoak'] != nextLoak :
    send({"message": "Your loak is fake...", "nextLoak" : nextLoak})
    loakCoins -= 1000
elif response['nextLoak'] == nextLoak :
    send({"nextLoak" : nextLoak})
    loakCoins += 400

if loakCoins <= 0:
    print("Drakloak runs away...")
elif loakCoins >= maxCoins:
    print("Drakloak approves of you!")
    print("Drakloak grants you", FLAG)


# Challenge: Drakloak
# Original: Guess God from Arkavidia 9.0 CTF Finals 2025
# Author: Etynso
# Source: https://github.com/chronopad/chrono-archive/tree/main/national/Arkavidia9.0-Finals_2025/cryptography/Guess%20God
# Description: PRNG state recovery via identifying the two custom field properties (or abuse the weak input validation).
# Date: 2025-05-28
# Files: https://github.com/chronopad/chronoOssifrage/tree/main/drakloak
# Sprite: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/886.png
# Tags: ["algc:Others", "prng:Custom", "addt:???"]
