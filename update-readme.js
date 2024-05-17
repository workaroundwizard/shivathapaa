const axios = require('axios');
const fs = require('fs').promises; // Use promises for better async handling

const mediumUsername = 'shivathapaa';
const devtoUsername = 'shivathapaa';

async function fetchMediumPosts() {
  try {
    const response = await axios.get(`https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/@${mediumUsername}`);
    return response.data.items.slice(0, 2).map(post => ({
      title: post.title,
      link: post.link
    }));
  } catch (error) {
    console.error('Error fetching Medium posts:', error);
    return [];
  }
}

async function fetchDevtoPosts() {
  try {
    const response = await axios.get(`https://dev.to/api/articles?username=${devtoUsername}`);
    return response.data.slice(0, 2).map(post => ({
      title: post.title,
      link: post.url
    }));
  } catch (error) {
    console.error('Error fetching Dev.to posts:', error);
    return [];
  }
}

async function readPreviousPosts() {
  try {
    const data = await fs.readFile('posts.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File does not exist, return empty structure
      return { medium: [], devto: [] };
    } else {
      console.error('Error reading previous posts:', error);
      throw error;
    }
  }
}

async function writePosts(posts) {
  try {
    await fs.writeFile('posts.json', JSON.stringify(posts, null, 2));
  } catch (error) {
    console.error('Error writing posts to file:', error);
    throw error;
  }
}

async function updateReadme() {
  try {
    const [mediumPosts, devtoPosts] = await Promise.all([fetchMediumPosts(), fetchDevtoPosts()]);
    const previousPosts = await readPreviousPosts();

    const hasChanges =
      JSON.stringify(mediumPosts) !== JSON.stringify(previousPosts.medium) ||
      JSON.stringify(devtoPosts) !== JSON.stringify(previousPosts.devto);

    if (hasChanges) {
      const content = `
<!-- BLOG-POST-LIST:START -->
### Medium
${mediumPosts.map(post => `- [${post.title}](${post.link})`).join('\n')}

### Dev.to
${devtoPosts.map(post => `- [${post.title}](${post.link})`).join('\n')}
<!-- BLOG-POST-LIST:END -->
`;

      let readmeContent;
      try {
        readmeContent = await fs.readFile('README.md', 'utf8');
      } catch (fileError) {
        console.error('Error reading README file:', fileError);
        console.log('::set-output name=changed::false');
        return;
      }

      const updatedReadme = readmeContent.replace(/<!-- BLOG-POST-LIST:START -->[\s\S]*<!-- BLOG-POST-LIST:END -->/, content.trim());

      try {
        await fs.writeFile('README.md', updatedReadme);
        await writePosts({ medium: mediumPosts, devto: devtoPosts });
      } catch (fileError) {
        console.error('Error writing to README or posts.json:', fileError);
        console.log('::set-output name=changed::false');
        return;
      }

      console.log('::set-output name=changed::true');
    } else {
      console.log('::set-output name=changed::false');
    }
  } catch (error) {
    console.error('Error updating README:', error);
    console.log('::set-output name=changed::false');
  }
}

updateReadme();
