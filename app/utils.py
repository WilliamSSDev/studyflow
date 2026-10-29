from slowapi.util import get_remote_address
from slowapi import Limiter
from slowapi.middleware import SlowAPIMiddleware

from html import escape
from html.parser import HTMLParser

limiter = Limiter(key_func=get_remote_address)


class SafeHtmlParser(HTMLParser):

	allowed_tags = {"b", "br", "em", "i", "li", "ol", "p", "strong", "u", "ul"}

	def __init__(self):
		super().__init__(convert_charrefs=True)
		self.parts = []

	def handle_starttag(self, tag, attrs):
		if tag in self.allowed_tags:
			self.parts.append(f"<{tag}>")

	def handle_startendtag(self, tag, attrs):
		if tag in self.allowed_tags:
			self.parts.append(f"<{tag}>")

	def handle_endtag(self, tag):
		if tag in self.allowed_tags and tag != "br":
			self.parts.append(f"</{tag}>")

	def handle_data(self, data):
		self.parts.append(escape(data))


def sanitize_card_content(content: str) -> str:
	parser = SafeHtmlParser()
	parser.feed(content or "")
	parser.close()
	return "".join(parser.parts).strip()
