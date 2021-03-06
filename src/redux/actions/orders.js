import axios from "axios";

import { CREATE_ORDER, ORDER_LISTED } from "./actionTypes";
import { clearCart } from "./carts";
import Order from "../../data/models/order";

const config = {
  headers: {
    "Content-Type": "application/json",
  },
};

export const listOrders = () => async (dispatch, getState) => {
  try {
    const userId = getState().auth.userId;
    const res = await axios.get(
      `https://rn-shop-5c7c3.firebaseio.com/orders/${userId}.json`
    );

    const orders = res.data
      ? Object.keys(res.data).reduce(
          (acc, key) => [
            ...acc,
            new Order(
              key,
              res.data[key].items,
              res.data[key].totalAmount,
              res.data[key].date
            ),
          ],
          []
        )
      : [];

    dispatch({
      type: ORDER_LISTED,
      payload: orders,
    });
  } catch (error) {
    throw error;
  }
};

export const createOrder = (items, totalAmount) => async (
  dispatch,
  getState
) => {
  const payload = {
    items,
    totalAmount,
    date: new Date().toISOString(),
  };

  // console.log(items);

  try {
    const { token, userId } = getState().auth;
    const res = await axios.post(
      `https://rn-shop-5c7c3.firebaseio.com/orders/${userId}.json?auth=${token}`,
      payload,
      config
    );

    dispatch({
      type: CREATE_ORDER,
      payload: {
        ...payload,
        id: res.data.name,
      },
    });

    const pushConfig = {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
    };

    const pushNotificationPromises = items.map((item) => {
      axios.post(
        "http://exp.host/--/api/v2/push/send",
        {
          to: item.pushToken,
          title: `${item.title} sold!`,
          body: `Some one purchased your product ${item.title}`,
        },
        pushConfig
      );
    });
    Promise.all(pushNotificationPromises);

    dispatch(clearCart());
  } catch (error) {
    console.log(error.response.data);
    throw error;
  }
};
