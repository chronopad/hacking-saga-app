p = 3711307719289846942219567023821864189758609249064872089779

class LoakOne:
    class LoakOneElement:
        def __init__(self, parent, x, y):
            self.parent = parent
            self.x = x
            self.y = y

        def __add__(self, other):
            a = self.parent.a
            b = self.parent.b

            x0, y0 = self.x, self.y
            x1, y1 = other.x, other.y
            
            A = x0 * x1 % p
            B = x0 * y1 % p
            C = y0 * x1 % p
            D = y0 * y1 % p
            E = (A - b * D) % p
            F = (B + C - a * D) % p

            return self.parent(E, F)

        def __mul__(self, n):
            result = self.parent(1, 0)
            base = self
            while n > 0:
                if n % 2 == 1:
                    result = result + base
                base = base + base
                n //= 2
            return result
        
        def __rmul__(self, n):
            return self.__mul__(n)
        
        def list(self):
            return [self.x, self.y]

    def __init__(self, a, b):
        self.a = a
        self.b = b

    def __call__(self, x, y):
        return LoakOne.LoakOneElement(self, x, y)