export interface CreateUserParams {
    username: string;
    first_name?: string;
    last_name?: string;
    email: string;
    password: string;
    membership_level: number;
}