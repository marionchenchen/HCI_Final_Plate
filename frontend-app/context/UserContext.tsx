import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type UserContextValue = {
    userId: number | null;
    loading: boolean;
    loginAs: (id: number) => Promise<void>;
};

const UserContext = createContext<UserContextValue>({
    userId: null,
    loading: true,
    loginAs: async () => {},
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [userId, setUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const loginAs = async (id: number) => {
        await AsyncStorage.setItem("user_id", id.toString());
        setUserId(id);
    };

    useEffect(() => {
        const init = async () => {
            try {
                const stored = await AsyncStorage.getItem("user_id");
                if (stored) {
                    setUserId(parseInt(stored, 10));
                } else {
                    await loginAs(1);
                }
            } catch (err) {
                console.error("init user_id error", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    return (
        <UserContext.Provider value={{ userId, loading, loginAs }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);