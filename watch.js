const params = new URLSearchParams(window.location.search);
const videoId = params.get('id');
const token = localStorage.getItem('token');

fetch(`http://localhost:3000/api/video/${videoId}`)
  .then(res => res.json())
  .then(video => {
    document.getElementById('mainVideo').src = video.videoUrl;
    document.getElementById('videoTitle').textContent = video.title;
    document.getElementById('videoDescription').textContent = video.description;
    document.getElementById('videoMeta').textContent = `${video.views} views · ♥ ${video.likes} · ⬇️ ${video.downloads} downloads · Uploaded ${new Date(video.uploadDate).toDateString()}`;
    document.getElementById('downloadBtn').href = video.videoUrl;
  });
downloadBtn.addEventListener('click', async () => {
  await fetch(`http://localhost:3000/api/video/${videoId}/download`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
});


document.getElementById('likeBtn').addEventListener('click', async () => {
  await fetch(`http://localhost:3000/api/video/${videoId}/like`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
  location.reload();
});

document.getElementById('commentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = document.getElementById('commentText').value;
  await fetch(`http://localhost:3000/api/video/${videoId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ text })
  });
  location.reload();
});

fetch(`http://localhost:3000/api/video/${videoId}/comments`)
  .then(res => res.json())
  .then(comments => {
    const list = document.getElementById('commentList');
    comments.forEach(c => {
      const div = document.createElement('div');
      div.className = 'comment';
      div.innerHTML = `<strong>${c.user.username}</strong>: ${c.text}`;
      list.appendChild(div);
    });
  });