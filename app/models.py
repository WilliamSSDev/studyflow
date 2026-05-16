from sqlalchemy import create_engine, Column, String, Integer, Boolean, Float, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy import DateTime, Enum as SqlEnum
from datetime import datetime, timezone
from enum import Enum

from datetime import timedelta, datetime

db = create_engine("postgresql://postgres:1234@localhost:5432/flashcards")

Base = declarative_base()

class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

def get_next_review(difficulty: Difficulty):

    now = datetime.now(timezone.utc)

    if difficulty == Difficulty.EASY:
        return now + timedelta(days=4)

    elif difficulty == Difficulty.MEDIUM:
        return now + timedelta(seconds=10)

    elif difficulty == Difficulty.HARD:
        return now

class User(Base):

    __tablename__ = 'usuarios'

    id = Column("id", Integer, nullable=False, autoincrement=True, primary_key=True)
    name = Column("name", String)
    email = Column("email", String, nullable=False)
    password = Column("password", String)
    admin = Column("admin", Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    current_streak = Column(Integer, default=0)

    cards = relationship("Card", back_populates="user")
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

    user_id = Column(Integer, ForeignKey("usuarios.id"))

    user = relationship('User', back_populates='cards')
    

class ReviewLog(Base):

    __tablename__ = "review_logs"

    id = Column(Integer, nullable=False, autoincrement=True, primary_key=True)
    reviewed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # What was the user's performance? (e.g., 'hard', 'medium', 'good', 'easy')
    # You can use your SqlEnum(Difficulty) here if you consider "Hard" as incorrect, 
    # or a string if you want to log exact button choices.
    rating = Column(SqlEnum(Difficulty), nullable=False)

    # Relationships
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)

    user = relationship("User", back_populates="review_logs")
    card = relationship("Card")

if __name__ == '__main__':

    Base.metadata.drop_all(bind=db)
    Base.metadata.create_all(bind=db)



    


