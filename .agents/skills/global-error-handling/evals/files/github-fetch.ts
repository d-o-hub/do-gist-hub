// BUG: No error handling - raw fetch with no error codes or user messages
export async function fetchGist(gistId: string, token: string) {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/json'
    }
  });
  
  const data = await response.json();
  return data;
}

export async function createGist(title: string, files: Record<string, any>, token: string) {
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description: title,
      files
    })
  });
  
  const data = await response.json();
  return data;
}
