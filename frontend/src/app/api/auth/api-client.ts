type ApiResponse<T> = {
  data?: T;
  error?: string;
};

// ログイン処理
// export async function loginUser(username: string, password: string): Promise<ApiResponse<{ user: any }>> {
//   try {
//     const response = await fetch('/api/auth/login', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ username, password }),
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       return { error: data.error || 'ログインに失敗しました' };
//     }

//     return { data };
//   } catch (error) {
//     console.error('APIエラー:', error);
//     return { error: 'ネットワークエラーが発生しました' };
//   }
// }

export async function registerUser(
  name: string, 
  email: string, 
  password: string,
  confirmPassword: string
): Promise<ApiResponse<{ user: any }>> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { error: data.error || 'ユーザー登録に失敗しました' };
    }
    return { data };
  } catch (error) {
    console.error('APIエラー:', error);
    return { error: 'ネットワークエラーが発生しました' };
  }
}
