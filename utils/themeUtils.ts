
// Utility for consistent styling across the app

export const getStatusColor = (status: string, type: 'bg' | 'text' | 'border' | 'badge' = 'badge'): string => {
    const map: Record<string, { bg: string, text: string, border: string }> = {
        // Generic Status
        success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
        warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
        danger:   { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
        info:     { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
        neutral:  { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
        
        // Specific Business Status
        occupied: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
        free:     { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
        reserved: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
        
        healthy:  { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
        critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
        
        pending:  { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
        completed:{ bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
        paid:     { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    };

    const config = map[status.toLowerCase()] || map['neutral'];

    if (type === 'badge') {
        return `${config.bg} ${config.text} ${config.border} border`;
    }
    return config[type];
};

export const getProductImage = (category: string, index: number = 0) => {
    // Import dynamically or use a map
    // For now we use the map from constants but this util centralizes the logic
    // This avoids importing the huge constant array everywhere
    const bases = {
        vivres: ['https://images.unsplash.com/photo-1488459716781-31db52582fe9'],
        textile: ['https://images.unsplash.com/photo-1520006403909-838d6b92c22e'],
        electronique: ['https://images.unsplash.com/photo-1550009158-9ebf69173e03'],
        divers: ['https://images.unsplash.com/photo-1531297461136-82lw9b44d94l']
    };
    // @ts-ignore
    const arr = bases[category] || bases.divers;
    return `${arr[index % arr.length]}?auto=format&fit=crop&w=400&q=80`;
};
