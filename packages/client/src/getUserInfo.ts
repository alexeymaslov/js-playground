import {
  adjectives,
  animals,
  uniqueNamesGenerator
} from 'unique-names-generator';
import { getRandomColor } from '@my/shared';

export function getUserInfo(): { username: string; color: string } {
  const usernameFromLocalStorage = localStorage.getItem('username');
  const colorFromLocalStorage = localStorage.getItem('color');
  if (usernameFromLocalStorage !== null && colorFromLocalStorage !== null)
    return { username: usernameFromLocalStorage, color: colorFromLocalStorage };

  const adjective = uniqueNamesGenerator({
    dictionaries: [adjectives]
  });
  const color = getRandomColor();
  const animal = uniqueNamesGenerator({
    dictionaries: [animals]
  });
  const username = `${adjective} ${color} ${animal}`;
  localStorage.setItem('username', username);
  localStorage.setItem('color', color);

  return { username: username, color: color };
}
