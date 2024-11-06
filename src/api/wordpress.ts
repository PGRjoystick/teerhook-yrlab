import axios from 'axios';

// Replace with your WordPress site URL and credentials
const siteUrl = process.env.WORDPRESS_URL || '';
const username = process.env.WORDPRESS_USERNAME || '';
const password = process.env.WORDPRESS_APP_PASSWORD || '';

const fetchPostIdsByTagId = async (tagId: number): Promise<number[]> => {
    const postIds: number[] = [];
    let page = 1;
    let totalPages = 1;

    try {
        while (page <= totalPages) {
            const response = await axios.get(`${siteUrl}/wp-json/wp/v2/posts`, {
                params: {
                    tags: tagId,
                    per_page: 100,
                    page: page
                },
            });

            // Extract post IDs from the response
            const ids = response.data.map((post: { id: number }) => post.id);
            postIds.push(...ids);

            // Get the total number of pages from the response headers
            totalPages = parseInt(response.headers['x-wp-totalpages'], 10);
            page++;
        }
    } catch (error) {
        console.error(`Error fetching posts for tag ID ${tagId}:`, error);
    }

    return postIds;
};

export const updatePostPassword = async (tagId: number, newPassword: string) => {
    try {
        const postIds = await fetchPostIdsByTagId(tagId);
        for (const postId of postIds) {
            let attempts = 0;
            const maxAttempts = 5;
            let success = false;

            while (attempts < maxAttempts && !success) {
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
                    console.log(`Updated post ${postId}`);
                    success = true;
                } catch (error) {
                    if (error.response && error.response.status === 503) {
                        attempts++;
                        console.error(`Error 503 updating post ${postId}, attempt ${attempts}:`, error);
                        if (attempts < maxAttempts) {
                            // wait 5 seconds before retrying
                            await new Promise((resolve) => setTimeout(resolve, 5000));
                        } else {
                            console.error(`Failed to update post ${postId} after ${maxAttempts} attempts`);
                        }
                    } else {
                        console.error(`Error updating post ${postId}:`, error);
                        break;
                    }
                }
            }

            // wait 5 seconds before updating the next post
            await new Promise((resolve) => setTimeout(resolve, 5000));
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