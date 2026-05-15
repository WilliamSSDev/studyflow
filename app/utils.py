from slowapi.util import get_remote_address
from slowapi import Limiter
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address)