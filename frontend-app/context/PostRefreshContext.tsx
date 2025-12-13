// context/PostRefreshContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

type PostRefreshContextValue = {
    // 追蹤刷新的計數器
    refreshKey: number; 
    // 觸發刷新的函式
    triggerRefresh: () => void;
};

const PostRefreshContext = createContext<PostRefreshContextValue | undefined>(undefined);

export const PostRefreshProvider = ({ children }: { children: ReactNode }) => {
    // 每次變動時，數字都會增加，以此觸發 useEffect 重新執行
    const [refreshKey, setRefreshKey] = useState(0); 

    const triggerRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <PostRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
            {children}
        </PostRefreshContext.Provider>
    );
};

// Hook for consuming the context
export const usePostRefresh = () => {
    const context = useContext(PostRefreshContext);
    if (context === undefined) {
        throw new Error('usePostRefresh must be used within a PostRefreshProvider');
    }
    return context;
};