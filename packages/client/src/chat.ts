export type ChatMessage = {
  author: string;
  time: Date;
  text: string;
  color: string;
};

export class Chat {
  private readonly messagesElement: HTMLUListElement;

  constructor(
    messagesElement: HTMLUListElement,
    inputElement: HTMLInputElement,
    username: string,
    sendMessage: (message: Omit<ChatMessage, 'color'>) => void
  ) {
    this.messagesElement = messagesElement;
    inputElement.onkeypress = (ev) => {
      if (ev.key === 'Enter' && inputElement.value !== '') {
        const message = {
          author: username,
          time: new Date(),
          text: inputElement.value
        };
        inputElement.value = '';
        console.log(`[Chat] sending message: `, message);
        sendMessage(message);
      }
    };

    this.scrollBottom();
  }

  addMessage(message: ChatMessage): void {
    const liElement = document.createElement('li');
    const smallElement = document.createElement('small');
    smallElement.textContent = `${message.time.toLocaleTimeString()} ${
      message.author
    }`;
    liElement.textContent = message.text;
    liElement.prepend(smallElement);
    liElement.style.backgroundColor = message.color;
    this.messagesElement.appendChild(liElement);
    this.scrollBottom();
  }

  private scrollBottom() {
    this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
  }
}
