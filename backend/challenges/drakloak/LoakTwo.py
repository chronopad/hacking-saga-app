from Crypto.Util.number import inverse
from Crypto.Random.random import randint

def ez_sqrt(x) :
    return pow(x, (p + 1) // 4, p)

def legendre(x) :
    return pow(x, (p - 1) // 2, p)

DD = 119
p = 3711307719289846942219567023821864189758609249064872089779

class LoakTwo:
    class LoakTwoElement:
        def __init__(self, parent, x, y):
            self.parent = parent
            self.x = x
            self.y = y

        def __add__(self, other):
            a = self.parent.a
            b = self.parent.b

            x1, y1 = self.x, self.y
            x2, y2 = other.x, other.y

            ab = a * b % p
            ab2 = ab * ab % p
            abrec = inverse(ab, p) % p
            ab2rec = inverse(ab2, p) % p

            A = x1 * x2 % p
            B = x1 * y2 % p
            C = x2 * y1 % p
            D = y1 * y2 % p
            
            E = ab * A % p
            F = D * abrec % p
            G = DD * F * ab2rec % p
            H = ab * (B + C) % p

            X = (E - F + G) % p
            Y = (H + 2*D) % p

            return self.parent(X, Y)

        def __mul__(self, n):
            result = self.parent(inverse(self.parent.a * self.parent.b, p), 0)
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
        return LoakTwo.LoakTwoElement(self, x, y)
    
    def lift_x(self, x) :
        a, b = self.a, self.b
        invAB = inverse(a * b, p)
        A = - DD * invAB**2 + 1
        B = 2*a*b*x
        C = a**2 * b**2 * x**2 - 1

        disc = B**2 - 4 * A * C
        if legendre(disc) != 1 :
            return None
        
        discq = ez_sqrt(disc)
        y = ((-B + discq) * inverse(2 * A, p)) % p
        return self(x, y)
    
    def random_element(self) :
        G = None
        while G == None :
            x = randint(1, p - 1)
            G = self.lift_x(x)
        return G