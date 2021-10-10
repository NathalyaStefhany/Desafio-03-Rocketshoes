import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>()

  useEffect(() => {
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart

  useEffect(() => {
    if(cartPreviousValue !== cart) 
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const quantityOfProductsInStock = await 
        api.get(`/stock/${productId}`).then(response => response.data.amount)

      const productIndex = cart.findIndex((product) => product.id === productId)

      let updatedCart = [...cart]

      const currentAmount = productIndex !== -1 ? cart[productIndex].amount : 0
      const amount = currentAmount + 1

      if(quantityOfProductsInStock >= amount) {
        if(productIndex !== -1 ) updatedCart[productIndex].amount = amount
        else {
          const productInfo = await api.get(`/products/${productId}`).then(response => response.data)
        
          updatedCart.push({...productInfo, amount: amount})
        }

        setCart(updatedCart)
      }
      else toast.error('Quantidade solicitada fora de estoque');
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = cart.filter((product) => product.id !== productId)

      if(updatedCart.length === cart.length) throw Error()

      setCart(updatedCart)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) return

      const hasStock = await api.get(`/stock/${productId}`).then(response => {
        const productStock: Stock = response.data

        if(productStock.amount < amount) return false
        return true
      })
      
      if(hasStock){
        const updatedCart = cart.map((product) => {
          if(product.id === productId){
            return {
              ...product,
              amount: amount
            }
          }
          return product
        })

        setCart(updatedCart)
      }
      else toast.error('Quantidade solicitada fora de estoque');
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
