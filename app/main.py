from fastapi import FastAPI
from app.routes.auth import auth_route
from app.routes.user import user_route
from app.routes.cards import cards_route
from fastapi.middleware.cors import CORSMiddleware
from app.utils import limiter,SlowAPIMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allows all (for testing)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_route)
app.include_router(user_route)
app.include_router(cards_route)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

"""
Anki-like Flashcard Application

Goal:
Create a spaced-repetition learning system inspired by Anki, with improvements in usability, feedback, and automation.

Core Features:

* Create, edit, and delete flashcards stored in a database
* Each card contains:

  * Front: question / prompt
  * Back: answer / explanation
* Review system based on user performance
* Cards are scheduled to reappear over time (spaced repetition)

Review Flow:

1. A card is shown (front only)
2. User attempts to recall the answer
3. User reveals the back
4. User selects performance rating:

   * "Forgot"
   * "Correct"
5. System updates the next review time based on the rating

Core System Design:

Class: Card

* id
* front_content
* back_content
* created_at
* last_reviewed
* next_review
* difficulty
* interval
* review_count

Class: ReviewSession

* Handles selection of cards due for review
* Applies scheduling algorithm
* Tracks session statistics

Class: Scheduler

* Responsible for calculating next_review
* Uses spaced repetition logic (custom algorithm)

Class: DatabaseManager

* Handles persistence (SQLite)
* CRUD operations for cards

Key Difference From Default Anki:

* Simplified rating system (2 buttons instead of 4)
* Custom difficulty adaptation logic
* Real-time feedback and stats during study
* More intuitive UI/UX flow

Possible Enhancements:

* Tag system for organizing cards
* Daily goal tracking
* Streak system
* Weak-topic detection
* AI-generated hints or explanations

"""