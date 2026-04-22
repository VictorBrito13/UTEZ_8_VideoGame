import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import { BackButton } from "../../../common/ui/BackButton";
import { Container } from "../../../common/ui/Container";
import { Heading } from "../../../common/ui/Heading";
import { Text } from "../../../common/ui/Text";
import { motion, AnimatePresence } from "framer-motion";

interface InventoryItem {
  id: number;
  quantity: number;
  object: {
    id: number;
    name: string;
    description: string;
    effect_type: string;
    effect_value: number;
    rarity: string;
    vfx_type: string;
    sprite?: string;
  };
}

export const InventoryPage = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useStatus, setUseStatus] = useState<{
    msg: string;
    type: "success" | "error" | "info";
  } | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await apiClient.get("/api/inventory/");
        const invData = Array.isArray(response.data)
          ? response.data[0]
          : response.data;
        setItems(invData?.items || []);
        setLoadError(null);
      } catch {
        setLoadError(
          "Could not load your inventory. Please refresh or try again later.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const handleUseItem = async (_itemId: number) => {
    try {
      setUseStatus({
        msg: "Items are used during battles. Start a match from the dashboard.",
        type: "info",
      });
      setTimeout(() => setUseStatus(null), 4000);
    } catch {
      setUseStatus({
        msg: "Something went wrong. Please try again.",
        type: "error",
      });
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "LEGENDARY":
        return "text-orange-500 border-orange-500 bg-orange-500/10";
      case "RARE":
        return "text-purple-500 border-purple-500 bg-purple-500/10";
      case "UNCOMMON":
        return "text-blue-500 border-blue-500 bg-blue-500/10";
      default:
        return "text-outline border-[#2d3449] bg-[#0B1326]";
    }
  };

  return (
    <Container variant="page" className="flex-col min-h-screen pt-24 pb-12">
      <div className="w-full max-w-7xl mx-auto px-4 relative z-10">
        <div className="mb-8 flex flex-col md:flex-row items-center gap-6">
          <BackButton />
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-6 h-6 bg-tertiary shadow-[2px_2px_0_rgba(0,0,0,0.5)]"></div>
              <Heading level={1} className="terminal-glow text-tertiary">
                STRATEGY INVENTORY
              </Heading>
            </div>
            <Text variant="secondary">
              Consumables and tactical items for battle enhancement.
            </Text>
          </div>
        </div>

        <AnimatePresence>
          {useStatus && (() => {
            let statusClasses = "bg-error-container border-on-error text-on-error-container";
            let icon = "error";
            if (useStatus.type === "success") {
              statusClasses = "bg-tertiary-container border-tertiary text-on-tertiary-container";
              icon = "check_circle";
            } else if (useStatus.type === "info") {
              statusClasses = "bg-secondary-container border-secondary text-on-secondary-container";
              icon = "info";
            }
            return (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-8 p-4 rounded-sm border-2 flex items-center gap-4 font-headline tracking-widest uppercase text-[10px] shadow-[4px_4px_0_rgba(0,0,0,0.5)] ${statusClasses}`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                <p className="font-black">{useStatus.msg}</p>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {loadError && !loading && (
          <div className="mb-8 rounded-sm border-2 border-on-error bg-error-container/80 px-4 py-3 text-sm text-on-error-container font-headline tracking-widest uppercase flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="material-symbols-outlined animate-spin text-tertiary text-6xl">autorenew</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((item, index) => (
              <motion.div
                key={item.id || `inv-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-[#0B1326] border-2 border-[#2d3449] rounded-sm p-6 overflow-hidden transition-all hover:border-tertiary shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] flex flex-col"
              >
                <div className="flex justify-between items-start mb-6">
                  <div
                    className={`relative w-16 h-16 flex items-center justify-center rounded-sm border-2 ${getRarityColor(item.object.rarity)} transition-transform group-hover:scale-110 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]`}
                  >
                    <AnimatePresence>
                      {item.object.sprite ? (
                        <motion.img
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={{
                            y: [0, -4, 0],
                            transition: {
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            },
                          }}
                          src={item.object.sprite}
                          alt={item.object.name}
                          className="w-12 h-12 object-contain image-rendering-pixelated drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-3xl opacity-50" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-headline font-black text-outline group-hover:text-tertiary transition-colors">
                      x{item.quantity}
                    </span>
                  </div>
                </div>

                <div
                  className={`text-[9px] font-headline font-black uppercase mb-2 ${getRarityColor(item.object.rarity).split(" ")[0]} tracking-[0.3em]`}
                >
                  [{item.object.rarity}]
                </div>
                <h3 className="text-lg font-headline font-black mb-2 group-hover:text-tertiary transition-colors uppercase tracking-widest text-white">
                  {item.object.name}
                </h3>
                <p className="text-[10px] text-outline mb-6 leading-relaxed h-10 line-clamp-2 font-headline uppercase font-bold tracking-widest">
                  {item.object.description}
                </p>

                <div className="flex items-center justify-between gap-4 mt-auto">
                  <div className="flex items-center gap-1.5 text-[9px] font-headline font-black text-on-surface px-2 py-1 bg-surface-container-low border border-[#2d3449] uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[12px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    {item.object.effect_type}
                  </div>
                  <button
                    onClick={() => handleUseItem(item.id)}
                    className="flex items-center gap-1 text-[9px] font-headline font-black uppercase tracking-widest text-on-surface hover:text-tertiary transition-colors border border-transparent hover:border-tertiary px-2 py-1 beveled-button"
                  >
                    USE <span className="material-symbols-outlined text-[12px]">add</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && !loadError && items.length === 0 && (
          <div className="text-center py-24 bg-surface-container-low beveled-border shadow-[12px_12px_0px_0px_rgba(0,0,0,0.5)]">
            <div className="w-16 h-16 bg-[#0B1326] border-2 border-[#2d3449] rounded-sm flex items-center justify-center mx-auto mb-6 text-outline shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)]">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
            </div>
            <p className="text-outline font-headline font-bold uppercase tracking-widest text-[10px]">
              INVENTORY EMPTY. <br /> WIN BATTLES TO EARN REWARDS.
            </p>
          </div>
        )}
      </div>
    </Container>
  );
};
