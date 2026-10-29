from sqlalchemy import create_engine, Column, String, Integer, Boolean, Float, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import DateTime, Enum as SqlEnum
from datetime import datetime, timezone
from enum import Enum
import os
from datetime import timedelta, datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

db = create_engine(DATABASE_URL)

Base = declarative_base()

class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    GOOD = "good"

def get_next_review(difficulty: Difficulty):

    now = datetime.now(timezone.utc)

    if difficulty == Difficulty.EASY:
        return now + timedelta(days=4)

    elif difficulty == Difficulty.MEDIUM:
        return now + timedelta(seconds=10)

    elif difficulty == Difficulty.GOOD:
        return now + timedelta(days=1)

    elif difficulty == Difficulty.HARD:
            return now

class User(Base):

    __tablename__ = 'users'

    id = Column("id", Integer, nullable=False, autoincrement=True, primary_key=True)
    name = Column("name", String)
    email = Column("email", String, nullable=False)
    password = Column("password", String)
    admin = Column("admin", Boolean, default=False)
    current_streak = Column(Integer, default=0)

    cards = relationship("Card", back_populates="user")
    decks = relationship("Deck", back_populates="user", cascade="all, delete-orphan")
    review_logs = relationship("ReviewLog", back_populates="user")

    def __init__(self, name, email, password, admin=False):

        self.name = name
        self.email = email
        self.password = password
        self.admin = admin

    class Config:
        from_attributes = True

class Card(Base):

    __tablename__ = 'cards'

    id = Column("id", Integer, nullable=False, autoincrement=True, primary_key=True)
    front_content = Column("front_content", String, nullable=False)
    back_content = Column("back", String, nullable=False)
    created_at = Column("created_at", DateTime, default=lambda: datetime.now(timezone.utc))
    next_review = Column("next_review", DateTime, nullable=False)
    last_reviewed = Column("last_reviewed", DateTime, nullable=False)
    difficulty = Column("difficulty", SqlEnum(Difficulty), nullable=False)
    interval = Column("interval", Integer, nullable=False)
    review_count = Column("review_count", Integer, default=0)

    user_id = Column(Integer, ForeignKey("users.id"))
    deck_id = Column(Integer, ForeignKey("decks.id", ondelete="SET NULL"), nullable=True)

    user = relationship('User', back_populates='cards')
    deck = relationship("Deck", back_populates="cards")


class Deck(Base):

    __tablename__ = "decks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="decks")
    cards = relationship("Card", back_populates="deck")
    

class ReviewLog(Base):

    __tablename__ = "review_logs"

    id = Column(Integer, nullable=False, autoincrement=True, primary_key=True)
    reviewed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    rating = Column(SqlEnum(Difficulty), nullable=False)

    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)

    user = relationship("User", back_populates="review_logs")
    card = relationship("Card")

if __name__ == '__main__':

    Base.metadata.drop_all(bind=db)
    Base.metadata.create_all(bind=db)



    


