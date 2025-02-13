class Button {
  private element: HTMLButtonElement;

  constructor(id: string) {
    this.element = document.getElementById(id) as HTMLButtonElement;
    this.init();
  }

  private init(): void {
    this.element.addEventListener('click', () => {
      fetch('http://localhost:3000')
        .then((response) => response.json())
        .then((data) => {
          alert(JSON.stringify(data));
        })
        .catch((error) => {
          alert('エラーが発生しました:');
        });
    });
  }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  new Button('myButton');
});
