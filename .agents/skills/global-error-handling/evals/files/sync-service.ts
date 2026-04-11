// BUG: No offline detection - sync fails silently when offline
export class SyncService {
  private token: string;
  
  constructor(token: string) {
    this.token = token;
  }
  
  async syncToGitHub(localData: any) {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(localData)
    });
    
    return await response.json();
  }
  
  async pullFromGitHub(gistId: string) {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${this.token}`
      }
    });
    
    return await response.json();
  }
}
