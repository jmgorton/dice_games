const username = localStorage.getItem('diceGamesUsername');

if (username !== 'admin') {
  window.location.replace('/');
}
