from datetime import datetime, timedelta, timezone, time

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models import ReviewLog, User


async def get_studied_today(session: Session, user_id: int) -> int:
    today = datetime.now().date()

    count = (
        session.query(ReviewLog)
        .filter(
            ReviewLog.user_id == user_id,
            ReviewLog.reviewed_at >= today
        )
        .count()
    )

    return count


async def get_correct_today(session: Session, user_id: int) -> int:
    today = datetime.combine(datetime.now().date(), time.min)

    count = session.query(ReviewLog).filter(
        ReviewLog.user_id == user_id,
        ReviewLog.reviewed_at >= today,
        ReviewLog.rating != 'hard'
    ).count()

    return count


async def _update_streak(
    session: Session,
    user_id: int,
    logs: list[ReviewLog]
) -> None:

    user = session.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(404, "User not found")

    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)

    reviewed_dates = {
        log.reviewed_at.date()
        for log in logs
    }

    if yesterday not in reviewed_dates and today not in reviewed_dates:
        user.current_streak = 0
        session.commit()
        return

    current_streak = 1
    check_date = today - timedelta(days=1)

    while check_date in reviewed_dates:
        current_streak += 1
        check_date -= timedelta(days=1)

    user.current_streak = current_streak
    session.commit()


async def get_current_streak(session: Session, user_id):
    user = session.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(404, 'User not found')

    return user.current_streak


async def get_reviewed_days(days_period: int, session: Session, user_id):
    period = datetime.now(timezone.utc) - timedelta(days=days_period)

    logs = session.query(ReviewLog).options(joinedload(ReviewLog.card)).filter(
        ReviewLog.user_id == user_id,
        ReviewLog.reviewed_at > period
    ).all()

    return logs
