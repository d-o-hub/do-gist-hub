export class SyncService {
  private token: string;
  
  constructor(token: string) {
    this.token = token;
  }
  
  async syncToGitHub(localData: any) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Offline');
    }

    try {
      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(localData)
      });

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Offline');
      }
      throw error;
    }
  }
  
  async pullFromGitHub(gistId: string) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Offline');
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `token ${this.token}`
        }
      });

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Offline');
      }
      throw error;
    }
  }
}
