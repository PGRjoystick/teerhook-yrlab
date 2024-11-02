import axios from 'axios';

// Replace with your WordPress site URL and credentials
const siteUrl = process.env.WORDPRESS_URL || '';
const username = process.env.WORDPRESS_USERNAME || '';
const password = process.env.WORDPRESS_APP_PASSWORD || '';
const filteredPostIds = [66547, 66379, 66380]; 

// Function to fetch post IDs based on tag ID
const fetchPostIdsByTagId = async (tagId: number): Promise<number[]> => {
    try {
        const response = await axios.get(`${siteUrl}/wp-json/wp/v2/posts`, {
            params: {
                tags: tagId,
                per_page: 100, 
                page: 1
            },
        });

        // Extract post IDs from the response
        return response.data.map((post: { id: number }) => post.id);
    } catch (error) {
        console.error(`Error fetching posts for tag ID ${tagId}:`, error);
        return [];
    }
};

export const updatePostPassword = async (tagId: number, newPassword: string) => {
    try {
        const postIds = await fetchPostIdsByTagId(tagId);
        for (const postId of postIds) {
            try {
                const response = await axios.post(
                    `${siteUrl}/wp-json/wp/v2/posts/${postId}`,
                    {
                        password: newPassword,
                    },
                    {
                        auth: {
                            username,
                            password,
                        },
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );
                console.log(`Updated post ${postId}:`, response.data);
            } catch (error) {
                console.error(`Error updating post ${postId}:`, error);
            }
        }
    } catch (error) {
        console.error(`Error updating posts for tag ID ${tagId}:`, error);
    }
};

// const updateAllPostPasswords = async () => {
//     for (const postId of filteredPostIds) {
//         await updatePostPassword(postId);
//     }
// };

export async function changePasswordProtectedPostsByCategory(categoryName: string, password: string) {
    const wpUrl = process.env.WORDPRESS_URL || '';
    const username = process.env.WORDPRESS_USERNAME || '';
    const applicationPassword = process.env.WORDPRESS_APP_PASSWORD || '';
    const authHeader = `Basic ${Buffer.from(`${username}:${applicationPassword}`).toString('base64')}`;

    try {
        const categoryId = await getCategoryIDByName(categoryName, wpUrl, authHeader);
        if (categoryId === null) {
            return;
        }

        // Fetch posts by category ID
        const response = await axios.get(`${wpUrl}/wp-json/wp/v2/posts`, {
            params: {
                categories: categoryId
            },
            headers: {
                'Authorization': authHeader
            }
        });

        const posts = response.data;

        // Loop through the posts and update each one to be password protected
        for (const post of posts) {
            await axios.post(`${wpUrl}/wp-json/wp/v2/posts/${post.id}`, {
                password: password
            }, {
                headers: {
                    'Authorization': authHeader
                }
            });
        }

        console.log('Posts updated successfully');
    } catch (error) {
        console.error('Error updating posts:', error);
    }
}
async function getCategoryIDByName(categoryName: string, wpUrl: string, authToken: string): Promise<number | null> {
    try {
        const response = await axios.get(`${wpUrl}/wp-json/wp/v2/categories`, {
            params: {
                search: categoryName
            },
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const categories = response.data;
        if (categories.length > 0) {
            return categories[0].id;
        } else {
            console.error('Category not found');
            return null;
        }
    } catch (error) {
        console.error('Error fetching category ID:', error);
        return null;
    }
}