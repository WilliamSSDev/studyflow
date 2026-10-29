from datetime import datetime, time, timezone

from sqlalchemy.orm import Session

from app.models import Card, Deck, ReviewLog
from app.schemas import DeckResponse


def serialize_deck(deck: Deck, session: Session, user_id: int) -> DeckResponse:
    cards = session.query(Card).filter(Card.deck_id == deck.id).all()
    today = datetime.combine(datetime.now(timezone.utc).date(), time.min)
    studied_card_ids = {
        review.card_id
        for review in session.query(ReviewLog).filter(
            ReviewLog.user_id == user_id,
            ReviewLog.reviewed_at >= today,
            ReviewLog.card_id.in_([card.id for card in cards]) if cards else False,
        ).all()
    }
    pending_cards = sum(
        1 for card in cards
        if card.next_review and card.next_review <= datetime.utcnow()
    )
    return DeckResponse(
        id=deck.id,
        name=deck.name,
        description=deck.description,
        total_cards=len(cards),
        pending_cards=pending_cards,
        studied_cards=len(studied_card_ids),
    )
