from app.utils import limiter, sanitize_card_content
from fastapi import APIRouter, Depends, HTTPException,status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import DateTime, text
from app.dependencies import verify_token, get_session
from app.models import User, Card as CardM, ReviewLog, Difficulty, Deck, get_next_review
from app.schemas import Card
from datetime import datetime, timezone
import csv
import io
import re

from app.services.review_stats import (
    get_studied_today,
    get_correct_today,
    get_current_streak,
    get_reviewed_days,
)

cards_route = APIRouter(prefix="/cards", tags=['cards'])

@cards_route.get(path="/reviews_period")
async def get_cards_reviews(days_period: int, usuario: User = Depends(verify_token), session: Session = Depends(get_session)):

    # Lookup function to get days period where user has reviewed cards.
    reviews_days = await get_reviewed_days(days_period, session, usuario.id)

    reviewed_info: dict = {}
    try:
        for log in reviews_days:

            date = log.reviewed_at.date()
            if date in reviewed_info.keys():
                reviewed_info[date] += 1

            else:
                reviewed_info.setdefault(log.reviewed_at.date(), 1)
    except TypeError as e:
        print(f"Erro ao processar os logs de revisão: {e}")
        print(f"Logs de revisão recebidos: {reviews_days}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar os logs de revisão."
        )

    return reviewed_info


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

    deck_id = card.deck_id
    if deck_id is not None:
        deck = session.query(Deck).filter(
            Deck.id == deck_id,
            Deck.user_id == usuario.id,
        ).first()
        if not deck:
            raise HTTPException(status_code=404, detail="Deck não encontrado.")

    front_content = sanitize_card_content(card.front_content)
    back_content = sanitize_card_content(card.back_content)
    if not front_content or not back_content:
        raise HTTPException(status_code=400, detail="Front e back são obrigatórios.")

    new_card = CardM(
        front_content=front_content,
        back_content=back_content,
        next_review=datetime.now(timezone.utc),
        last_reviewed=datetime.now(timezone.utc),
        difficulty=Difficulty.EASY,
        interval=1,
        user_id=usuario.id,
        deck_id=deck_id,
    )

    session.add(new_card)
    session.commit()
    session.refresh(new_card)
    return {"message": "Flashcard criado com sucesso.", "card": new_card}

@cards_route.delete(path="/delete_card/{card_id}")
def delete_cards(card_id, usuario: User = Depends(verify_token), session: Session = Depends(get_session)):

    found_card = session.query(CardM).filter_by(id=card_id).first()

    if not found_card:
        raise HTTPException(404, 'Card was not found')

    if found_card.user_id != usuario.id:
        raise HTTPException(403, 'Cant delete a card you do not own.')

    session.query(ReviewLog).filter(ReviewLog.card_id == found_card.id).delete(
        synchronize_session=False
    )
    session.delete(found_card)
    session.commit()

    return {"message": 'Card has been deleted.'}

@cards_route.get(path="/pick_card")
def pick_card(
    deck_id: int | None = None,
    usuario: User = Depends(verify_token),
    session: Session = Depends(get_session),
):

    # Search for cards
    query = session.query(CardM).filter_by(user_id=usuario.id)
    if deck_id is not None:
        query = query.filter(CardM.deck_id == deck_id)
    cards = query.all()

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
    # usuario.current_streak += 1  # Incrementa o streak do usuário


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
def get_cards(
    amount: int,
    deck_id: int | None = None,
    usuario: User = Depends(verify_token),
    session: Session = Depends(get_session),
):

    query = session.query(CardM).filter_by(user_id=usuario.id)
    if deck_id is not None:
        query = query.filter(CardM.deck_id == deck_id)
    cards = query.all()

    if not cards:
        raise HTTPException(404, detail='No cards found')

    return {"cards": cards[:amount]}

@cards_route.post(path="/import_anki")
async def import_anki_cards(
    file: UploadFile = File(...),
    usuario: User = Depends(verify_token),
    session: Session = Depends(get_session)
):
    if not file.filename.endswith(('.txt', '.csv')):
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido.")

    try:
        contents = await file.read()
        text_content = contents.decode('utf-8')
        buffer = io.StringIO(text_content)
        reader = csv.reader(buffer, delimiter='\t')

        cards_para_inserir = []
        now_utc = datetime.now(timezone.utc)

        # Regex para capturar qualquer coisa que se pareça com [sound:nome_do_arquivo.mp3]
        regex_audio = re.compile(r'\[sound:[^\]]+\]')

        # Opcional: Regex para remover divs e spans excessivos se você quiser o texto 100% limpo
        regex_html = re.compile(r'<[^>]+>')

        for row in reader:
            if not row or row[0].startswith('#'):
                continue

            if len(row) >= 2:
                # 1. Aplica a limpeza do áudio na Frente e no Verso
                frente_limpa = regex_audio.sub('', row[0]).strip()
                verso_limpo = regex_audio.sub('', row[1]).strip()

                # 2. Remove quebras de linha acumuladas no início/fim das divs do Anki
                frente_limpa = frente_limpa.replace('<div>', '').replace('</div>', '\n').strip()
                verso_limpo = verso_limpo.replace('<div>', '').replace('</div>', '\n').strip()

                # Se você quiser tirar TODAS as tags HTML (incluindo cores e spans), descomente a linha abaixo:
                frente_limpa = regex_html.sub('', frente_limpa).strip()
                verso_limpo = regex_html.sub('', verso_limpo).strip()

                if not frente_limpa and not verso_limpo:
                    continue

                new_card = Card(
                    front_content=frente_limpa,
                    back_content=verso_limpo,
                    user_id=usuario.id,
                    created_at=now_utc,
                    next_review=now_utc,
                    last_reviewed=now_utc,
                    difficulty=Difficulty.MEDIUM.value,
                    interval=0,
                    review_count=0,
                    deck_id=1
                )

                deck_id = new_card.deck_id
                if deck_id is not None:
                    deck = session.query(Deck).filter(
                        Deck.id == deck_id,
                        Deck.user_id == usuario.id,
                    ).first()
                    if not deck:
                        raise HTTPException(status_code=404, detail="Deck não encontrado.")
            
                front_content = sanitize_card_content(new_card.front_content)
                back_content = sanitize_card_content(new_card.back_content)

                novo_card = CardM(
                    front_content=new_card.front_content,
                    back_content=new_card.back_content,
                    user_id=usuario.id,
                    created_at=now_utc,
                    next_review=now_utc,
                    last_reviewed=now_utc,
                    difficulty=Difficulty.MEDIUM.value,
                    interval=0,
                    review_count=0,
                    deck_id=new_card.deck_id
                )
                cards_para_inserir.append(novo_card)

        if not cards_para_inserir:
            raise HTTPException(status_code=400, detail="Nenhum card válido após a limpeza.")

        session.add_all(cards_para_inserir)
        session.commit()

        return {"message": f"{len(cards_para_inserir)} cartas limpas e importadas com sucesso!"}

    except Exception as e:
        session.rollback()
        print(f"Erro na importação: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar o arquivo.")







