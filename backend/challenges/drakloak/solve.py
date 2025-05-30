from pwn import *
import json
from LoakOne import LoakOne
from LoakTwo import LoakTwo

def send_res(num):
    io.sendline(json.dumps({"nextLoak": num}))

    return json.loads(io.recvline().decode())

io = process(["python3", "chall.py"])
context.log_level = "debug"

io.recvline()
io.recvline()
res = json.loads(io.recvline().decode())

# Unintended way
b1, x1, y1 = 0, 1, 1
io.sendline(json.dumps({"b1": b1, "x": x1, "y": y1}))

constant_prediction = send_res(1)["nextLoak"]
print("Predict:", constant_prediction)

for i in range(20):
    res = send_res(constant_prediction)
io.interactive()