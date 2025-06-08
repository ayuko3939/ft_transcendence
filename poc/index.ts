import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';
import ora from 'ora';

interface UserData {
  name?: string;
  email?: string;
  preferences?: string[];
}

class TUIApp {
  private userData: UserData = {};
  private isRunning = true;

  async start() {
    console.clear();
    this.showWelcome();
    
    while (this.isRunning) {
      await this.showMainMenu();
    }
    
    this.showGoodbye();
  }

  private showWelcome() {
    console.log(chalk.cyan(figlet.textSync('TUI POC', { horizontalLayout: 'full' })));
    console.log(chalk.green('InquirerでつくったTUIアプリケーションのPOCです\n'));
  }

  private async showMainMenu() {
    const choices = [
      { name: '📝 基本的な入力デモ', value: 'input' },
      { name: '📋 リスト選択デモ', value: 'list' },
      { name: '☑️  チェックボックスデモ', value: 'checkbox' },
      { name: '📊 プログレスバーデモ', value: 'progress' },
      { name: '🔧 設定メニュー', value: 'settings' },
      { name: '👤 ユーザー情報確認', value: 'profile' },
      { name: '🔄 データリセット', value: 'reset' },
      new inquirer.Separator(),
      { name: '🚪 終了', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'メニューを選択してください:',
        choices,
        pageSize: 10
      }
    ]);

    await this.handleAction(action);
  }

  private async handleAction(action: string) {
    switch (action) {
      case 'input':
        await this.inputDemo();
        break;
      case 'list':
        await this.listDemo();
        break;
      case 'checkbox':
        await this.checkboxDemo();
        break;
      case 'progress':
        await this.progressDemo();
        break;
      case 'settings':
        await this.settingsMenu();
        break;
      case 'profile':
        await this.showProfile();
        break;
      case 'reset':
        await this.resetData();
        break;
      case 'exit':
        this.isRunning = false;
        break;
    }

    if (this.isRunning) {
      await this.pressEnterToContinue();
    }
  }

  private async inputDemo() {
    console.log(chalk.yellow('\n=== 📝 基本的な入力デモ ==='));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'お名前を入力してください:',
        default: this.userData.name,
        validate: (input: string) => {
          if (input.trim().length === 0) {
            return '名前を入力してください';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'email',
        message: 'メールアドレスを入力してください:',
        default: this.userData.email,
        validate: (input: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(input)) {
            return '有効なメールアドレスを入力してください';
          }
          return true;
        }
      },
      {
        type: 'password',
        name: 'password',
        message: 'パスワードを入力してください:',
        mask: '*',
        validate: (input: string) => {
          if (input.length < 6) {
            return 'パスワードは6文字以上で入力してください';
          }
          return true;
        }
      },
      {
        type: 'number',
        name: 'age',
        message: '年齢を入力してください:',
        validate: (input: number) => {
          if (input < 0 || input > 120) {
            return '0から120の間で入力してください';
          }
          return true;
        }
      }
    ]);

    this.userData.name = answers.name;
    this.userData.email = answers.email;

    console.log(chalk.green('\\n✅ 入力が完了しました！'));
    console.log(`名前: ${chalk.cyan(answers.name)}`);
    console.log(`メール: ${chalk.cyan(answers.email)}`);
    console.log(`年齢: ${chalk.cyan(answers.age)}`);
  }

  private async listDemo() {
    console.log(chalk.yellow('\\n=== 📋 リスト選択デモ ==='));
    
    const { favoriteColor } = await inquirer.prompt([
      {
        type: 'list',
        name: 'favoriteColor',
        message: '好きな色を選択してください:',
        choices: [
          { name: '🔴 赤', value: 'red' },
          { name: '🔵 青', value: 'blue' },
          { name: '🟢 緑', value: 'green' },
          { name: '🟡 黄', value: 'yellow' },
          { name: '🟣 紫', value: 'purple' },
          new inquirer.Separator(' --- その他 ---'),
          { name: '⚫ 黒', value: 'black' },
          { name: '⚪ 白', value: 'white' }
        ]
      }
    ]);

    const { framework } = await inquirer.prompt([
      {
        type: 'rawlist',
        name: 'framework',
        message: '好きなJavaScriptフレームワークは？',
        choices: ['React', 'Vue.js', 'Angular', 'Svelte', 'Next.js']
      }
    ]);

    console.log(chalk.green('\\n✅ 選択完了！'));
    console.log(`好きな色: ${chalk.cyan(favoriteColor)}`);
    console.log(`好きなフレームワーク: ${chalk.cyan(framework)}`);
  }

  private async checkboxDemo() {
    console.log(chalk.yellow('\\n=== ☑️ チェックボックスデモ ==='));
    
    const { hobbies } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'hobbies',
        message: '趣味を選択してください（複数選択可）:',
        choices: [
          { name: '📚 読書', value: 'reading' },
          { name: '🎵 音楽鑑賞', value: 'music' },
          { name: '🎮 ゲーム', value: 'gaming' },
          { name: '🏃 運動', value: 'sports' },
          { name: '🍳 料理', value: 'cooking' },
          { name: '✈️ 旅行', value: 'travel' },
          { name: '🎨 アート', value: 'art' },
          { name: '💻 プログラミング', value: 'programming' }
        ],
        default: this.userData.preferences,
        validate: (answer: string[]) => {
          if (answer.length < 1) {
            return '少なくとも1つは選択してください';
          }
          return true;
        }
      }
    ]);

    this.userData.preferences = hobbies;

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'この選択で保存しますか？',
        default: true
      }
    ]);

    if (confirm) {
      console.log(chalk.green('\\n✅ 趣味を保存しました！'));
      console.log(`選択した趣味: ${chalk.cyan(hobbies.join(', '))}`);
    } else {
      console.log(chalk.yellow('\\n❌ 保存をキャンセルしました'));
    }
  }

  private async progressDemo() {
    console.log(chalk.yellow('\\n=== 📊 プログレスバーデモ ==='));
    
    const { startDemo } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'startDemo',
        message: 'プログレスバーのデモを開始しますか？',
        default: true
      }
    ]);

    if (!startDemo) return;

    const tasks = [
      'ファイルをダウンロード中',
      'データを処理中',
      'データベースに保存中',
      'キャッシュを更新中',
      '完了通知を送信中'
    ];

    for (let i = 0; i < tasks.length; i++) {
      const spinner = ora({
        text: tasks[i],
        color: 'cyan'
      }).start();

      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      spinner.succeed(chalk.green(tasks[i] + ' ✅'));
    }

    console.log(chalk.green('\\n🎉 すべてのタスクが完了しました！'));
  }

  private async settingsMenu() {
    console.log(chalk.yellow('\\n=== 🔧 設定メニュー ==='));
    
    const { settings } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'settings',
        message: '有効にする設定を選択してください:',
        choices: [
          { name: '🔔 通知を有効にする', value: 'notifications', checked: true },
          { name: '🌙 ダークモード', value: 'darkMode', checked: false },
          { name: '🔊 サウンドを有効にする', value: 'sound', checked: true },
          { name: '💾 自動保存', value: 'autoSave', checked: true },
          { name: '🔒 2段階認証', value: '2fa', checked: false }
        ]
      }
    ]);

    const { language } = await inquirer.prompt([
      {
        type: 'list',
        name: 'language',
        message: '言語を選択してください:',
        choices: [
          { name: '🇯🇵 日本語', value: 'ja' },
          { name: '🇺🇸 English', value: 'en' },
          { name: '🇨🇳 中文', value: 'zh' },
          { name: '🇰🇷 한국어', value: 'ko' }
        ],
        default: 'ja'
      }
    ]);

    console.log(chalk.green('\\n✅ 設定を更新しました！'));
    console.log(`有効な設定: ${chalk.cyan(settings.join(', '))}`);
    console.log(`言語: ${chalk.cyan(language)}`);
  }

  private async showProfile() {
    console.log(chalk.yellow('\\n=== 👤 ユーザー情報 ==='));
    
    if (!this.userData.name) {
      console.log(chalk.red('ユーザー情報が設定されていません。'));
      console.log('「基本的な入力デモ」でユーザー情報を入力してください。');
      return;
    }

    console.log(chalk.cyan('現在のユーザー情報:'));
    console.log(`名前: ${chalk.green(this.userData.name)}`);
    console.log(`メール: ${chalk.green(this.userData.email)}`);
    
    if (this.userData.preferences && this.userData.preferences.length > 0) {
      console.log(`趣味: ${chalk.green(this.userData.preferences.join(', '))}`);
    } else {
      console.log('趣味: 未設定');
    }
  }

  private async resetData() {
    console.log(chalk.yellow('\\n=== 🔄 データリセット ==='));
    
    const { confirmReset } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmReset',
        message: '本当にすべてのデータをリセットしますか？',
        default: false
      }
    ]);

    if (confirmReset) {
      const { doubleConfirm } = await inquirer.prompt([
        {
          type: 'input',
          name: 'doubleConfirm',
          message: 'リセットを実行するには "RESET" と入力してください:',
          validate: (input: string) => {
            if (input !== 'RESET') {
              return '"RESET" と正確に入力してください';
            }
            return true;
          }
        }
      ]);

      if (doubleConfirm === 'RESET') {
        this.userData = {};
        console.log(chalk.green('\\n✅ データをリセットしました！'));
      }
    } else {
      console.log(chalk.yellow('\\n❌ リセットをキャンセルしました'));
    }
  }

  private async pressEnterToContinue() {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Enterキーでメインメニューに戻ります...'),
        default: ''
      }
    ]);
  }

  private showGoodbye() {
    console.clear();
    console.log(chalk.magenta(figlet.textSync('Goodbye!', { horizontalLayout: 'full' })));
    console.log(chalk.green('TUIアプリケーションPOCをご利用いただき、ありがとうございました！\\n'));
  }
}

async function main() {
  const app = new TUIApp();
  await app.start();
}

if (require.main === module) {
  main().catch(console.error);
}

export default TUIApp;