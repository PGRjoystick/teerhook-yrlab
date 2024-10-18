import axios from 'axios';

export async function changePasswordProtectedPostsByCategory(category: string, password: string) {
    const wpUrl = process.env.WORDPRESS_URL;
    const authToken = process.env.WORDPRESS_AUTH_TOKEN;
    try {
        // Fetch posts by category
        const response = await axios.get(`${wpUrl}/wp-json/wp/v2/posts`, {
            params: {
                categories: category
            },
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const posts = response.data;

        // Loop through the posts and update each one to be password protected
        for (const post of posts) {
            await axios.post(`${wpUrl}/wp-json/wp/v2/posts/${post.id}`, {
                password: password
            }, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        }

        console.log('Posts updated successfully');
    } catch (error) {
        console.error('Error updating posts:', error);
    }
}