from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.dependencies import verify_token, get_session
from app.models import User, Card as CardM,ReviewLog, Difficulty, get_next_review
from app.schemas import Card
from datetime import datetime, timezone, timedelta, time

cards_route = APIRouter(prefix="/cards", tags=['cards'])

async def get_studied_today(session: Session, user_id: int) -> int:

    today = datetime.combine(datetime.now(timezone.utc).date(), time.min)

    print(f'Fusion of {datetime.now(timezone.utc).date()} + {time.min} = {today}')

    # Get how many cards were studied today
    count = session.query(ReviewLog).filter(ReviewLog.user_id == user_id, 
                                            ReviewLog.reviewed_at >= today).count()

    return count

async def get_correct_today(session: Session, user_id: int) -> int:

    today = datetime.combine(datetime.now(timezone.utc).date(), time.min)

    print(f'Fusion of {datetime.now(timezone.utc).date()} + {time.min} = {today}')

    # Get how many cards were answered correctly 
    count = session.query(ReviewLog).filter(ReviewLog.user_id == user_id, 
                                            ReviewLog.reviewed_at >= today,
                                            ReviewLog.rating != 'hard').count()

    return count

async def get_current_streak(session: Session, user_id):

    user = session.query(User).filter(User.id==user_id).first()

    if not user:
        raise HTTPException(404, 'User not found')

    return user.current_streak

@cards_route.get(path="/me")
async def get_user_info(
    usuario: User = Depends(verify_token), 
    session: Session = Depends(get_session)
) -> dict:
    
    # 1. Regra de segurança: Verifica o usuário ANTES de gastar processamento no banco
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,  # Se o token falhou, geralmente é 401 ou 404
            detail="Usuário não encontrado ou não autenticado."
        )

    # 2. Executa as queries de forma segura
    try:
        # Executa o .count() síncrono clássico (se a sua sessão permitir)
        total_cards = session.query(CardM).filter(CardM.user_id == usuario.id).count()
        
        # Garante o await nas suas funções assíncronas auxiliares
        studied_today = await get_studied_today(session, usuario.id)
        correct_answers_today = await get_correct_today(session, user_id=usuario.id)
        current_streak = await get_current_streak(session, usuario.id)

    except Exception as e:
        # Printa o erro real no terminal para você debugar
        print(f"Erro crítico no banco de dados: {e}")
        
        # Interrompe a requisição e avisa o Frontend de forma elegante (Status 500)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar as estatísticas no servidor."
        )

    # 3. Retorna o objeto limpo para o JavaScript (Só chega aqui se o 'try' deu 100% certo)
    return {
        "total_cards": total_cards,
        "studied_today": studied_today or 0,
        "correct_today": correct_answers_today or 0,
        "current_streak": current_streak or 0
    }


@cards_route.post(path="/add_card")
def add_card(card: Card, usuario: User = Depends(verify_token), session: Session = Depends(get_session)):

    print(usuario.id)

    new_card = CardM(
        front_content=card.front_content,
        back_content=card.back_content,
        next_review=datetime.now(timezone.utc),
        last_reviewed=datetime.now(timezone.utc),
        difficulty=Difficulty.EASY,
        interval=1,
        user_id=usuario.id
    )

    session.add(new_card)
    session.commit()

@cards_route.delete(path="/delete_card/{card_id}")
def delete_cards(card_id, usuario: User = Depends(verify_token), session: Session = Depends(get_session)):

    found_card = session.query(CardM).filter_by(id=card_id).first()

    if not found_card:
        return HTTPException(404, 'Card was not found')

    elif not found_card.user_id:
        session.delete(found_card)
        session.commit()
        return {"message": 'Card has been deleted.'}

    elif found_card.user_id != usuario.id:
        return HTTPException(403, 'Cant delete a card you do not own.')

    
    session.delete(found_card)
    session.commit()
    
    return {"message": 'card found'}

@cards_route.get(path="/pick_card")
def pick_card(usuario: User = Depends(verify_token), session: Session = Depends(get_session)):

    # Search for cards 
    cards = session.query(CardM).filter_by(user_id=usuario.id).all()

    if not cards:
        return HTTPException(404, detail='No cards were found')
    
    to_review = [card for card in cards if card.next_review <= datetime.utcnow()]

    if not to_review:
        return {"message": 'No cards to review were found', "total_cards": len(cards), "card": None, "cards_to_review": 0}
    
    sorted_cards = sorted(to_review, key=lambda x: x.next_review)

    return {"message": 'successful', "total_cards": len(cards), "card": sorted_cards[0], "cards_to_review": len(to_review)}

@cards_route.post(path="/update_card")
def update_card(
    difficulty: Difficulty, 
    card_id: int, 
    usuario: User = Depends(verify_token),
    session: Session = Depends(get_session)
):
    # 1. Busca o card no banco
    card = session.query(CardM).filter_by(id=card_id).first()

    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail='Card was not found'
        )
    
    if card.user_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Not authorized to modify this card."
        )
    
    # 2. Atualiza os dados do Card (incluindo o last_reviewed)
    now_utc = datetime.now(timezone.utc)
    card.review_count += 1
    card.last_reviewed = now_utc
    card.next_review = get_next_review(difficulty)
    card.difficulty = difficulty.value  # Garante que salva o valor/string do Enum

    # 3. Cria o registro histórico do Log
    log_entry = ReviewLog(
        user_id=usuario.id,
        card_id=card_id,
        rating=difficulty.value  # Garante consistência salvando a string/valor
    )
    session.add(log_entry)
    
    # 4. Ajuste Inteligente do Streak (Opcional - veja a nota abaixo)
    # Para evitar que o streak suba +1 a cada card individual no mesmo dia:
    # Idealmente, o streak deve ser processado em uma função separada ou validando a data.
    # Se quiser manter aqui por enquanto, vamos apenas garantir que ele não zere por conta de um card difícil:
    if difficulty == Difficulty.HARD:
        # Se você realmente quiser resetar o streak quando ele errar um card:
        usuario.current_streak = 0
    else:
        # Só incrementa se você quiser esse comportamento por card, 
        # mas lembre-se que o ideal é rodar isso uma vez por dia.
        pass 

    # 5. Um único COMMIT para todas as alterações (Card + Log + Usuário)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"Erro ao salvar revisão do card: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao salvar os dados no servidor."
        )

    # 6. Dica de ouro: Retorne os status atualizados para o seu painel lateral do Frontend!
    # Assim o JavaScript já atualiza a tela na hora sem precisar de outra requisição GET.
    return {
        "message": "Card updated successfully.",
        "stats": {
            "current_streak": usuario.current_streak,
            # Se você tiver acesso às funções de contagem aqui, pode injetá-las também
        }
    }

@cards_route.get(path="/cards/{amount}")
def get_cards(amount: int, usuario: User = Depends(verify_token),session: Session = Depends(get_session)):

    cards = session.query(CardM).filter_by(user_id=usuario.id).all()

    if not cards:
        raise HTTPException(404, detail='No cards found')

    return {"cards": cards[:amount]}






    





