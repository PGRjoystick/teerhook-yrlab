export type Media = {
    id: string;
    url: string;
    // Add more fields as per the actual structure
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
export type PaymentPayload = {
    created_at: string;
    transaction_id: string;
    type: string;
    supporter_name: string;
    supporter_avatar: string;
    supporter_message?: string;
    media?: Media; // Using the Media interface
    unit: string;
    unit_icon: string;
    quantity: number;
    price: number;
    net_amount: number;
}

export type LastTransactionPayload = {
    status: string;
    status_code: number;
    result: {
        data: Array<{
            supporter_name: string;
            support_message: string;
            quantity: number;
            amount: number;
            unit_name: string;
            updated_at: string;
        }>;
        meta: {
            include: string[];
            pagination: {
                total: number;
                count: number;
                per_page: number;
                current_page: number;
                total_pages: number;
                links: {
                    next?: string;
                };
            };
        };
    };
    message: string;
}
