def calculate_elo_delta(
    winner_rating: int,
    loser_rating: int,
    k_factor: int = 32,
) -> int:
    expected_winner = 1 / (1 + 10 ** ((loser_rating - winner_rating) / 400))
    return round(k_factor * (1 - expected_winner))
