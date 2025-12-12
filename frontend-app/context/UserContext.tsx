// context/UserContext.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
//import { v4 as uuidv4 } from "uuid";
// ⭐ 簡單亂數 + 時間：demo 用完全夠
function generateUserId() {
    return (
        "u_" +
        Math.random().toString(36).slice(2, 10) +
        "_" +
        Date.now().toString(36)
    );
}

type UserContextValue = {
    userId: string | null;
    loading: boolean;
};

const UserContext = createContext<UserContextValue>({
    userId: null,
    loading: true,
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                const stored = await AsyncStorage.getItem("user_id");
                if (stored) {
                    console.log("Existing user_id:", stored);
                    setUserId(stored);
                } else {
                    const newId = generateUserId();
                    await AsyncStorage.setItem("user_id", newId);
                    console.log("Generated new user_id:", newId);
                    setUserId(newId);
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
        <UserContext.Provider value={{ userId, loading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
