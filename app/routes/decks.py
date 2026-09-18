from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_session, verify_token
from app.models import Card, Deck, User
from app.schemas import DeckCreate, DeckResponse
from app.services.deck_service import serialize_deck


decks_route = APIRouter(prefix="/decks", tags=["decks"])


@decks_route.get("", response_model=list[DeckResponse])
def list_decks(
    usuario: User = Depends(verify_token),
    session: Session = Depends(get_session),
):
    decks = session.query(Deck).filter(Deck.user_id == usuario.id).order_by(Deck.created_at.desc()).all()
    return [serialize_deck(deck, session, usuario.id) for deck in decks]


@decks_route.post("", response_model=DeckResponse, status_code=status.HTTP_201_CREATED)
def create_deck(
    deck_data: DeckCreate,
    usuario: User = Depends(verify_token),
    session: Session = Depends(get_session),
):
    name = deck_data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="O nome do deck é obrigatório.")

    deck = Deck(name=name, description=deck_data.description, user_id=usuario.id)
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return serialize_deck(deck, session, usuario.id)


@decks_route.get("/{deck_id}", response_model=DeckResponse)
def get_deck(
    deck_id: int,
    usuario: User = Depends(verify_token),
    session: Session = Depends(get_session),
):
    deck = session.query(Deck).filter(Deck.id == deck_id, Deck.user_id == usuario.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck não encontrado.")
    return serialize_deck(deck, session, usuario.id)


@decks_route.get("/{deck_id}/cards")
def get_deck_cards(
    deck_id: int,
    usuario: User = Depends(verify_token),
    session: Session = Depends(get_session),
):
    deck = session.query(Deck).filter(Deck.id == deck_id, Deck.user_id == usuario.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck não encontrado.")
    cards = session.query(Card).filter(Card.deck_id == deck.id).order_by(Card.created_at.desc()).all()
    return {"deck": serialize_deck(deck, session, usuario.id), "cards": cards}
