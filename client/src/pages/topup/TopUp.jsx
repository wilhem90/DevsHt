import useAuth from "../../Authentication/UseAuth";
import Invoice from "../../components/invoice/Invoice";
import Load from "../../components/loading/load";
import Navbar from "../../components/navBar/Navbar";
import Sidebar from "../../components/sideBar/Sidebar";
import RequestApi from "../../services/RequestApi";
import "./TopUp.css";
import { useReducer, useState } from "react";

export default function TopUp() {
  const { user } = useAuth();

  const initialState = {
    countryName: "",
    operatorName: "",
    inputNumber: "",
    valueSelected: "",
    validateOnly: true,
  };

  function reducer(state, action) {
    switch (action.type) {
      case "FIELD_CHANGE":
        return {
          ...state,
          [action.name]: action.value,
        };
      case "RESET_FIELDS":
        return {
          ...state,
          operatorName: "",
          inputNumber: "",
          valueSelected: "",
        };
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, initialState);
  const [showAutoComplete, setShowAutoComplete] = useState("showAutoComplete");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [operators, setOperators] = useState([]);
  const [values, setValues] = useState({});
  const [skuCode, setSkuCode] = useState(null);
  const [estimated, setEstimated] = useState(0);
  const [countryIso, setCountryIso] = useState(null);
  const [load, setLoad] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [transferId, setTransferId] = useState(null);
  const [statusTransaction, setStatusTransaction] = useState(null);

  const countries = [
    { countryName: "Haiti", MinimumLength: 11, MaximumLength: 11 },
    { countryName: "Mexico", MinimumLength: 12, MaximumLength: 12 },
    { countryName: "Dominican_Republic", MinimumLength: 11, MaximumLength: 11 },
    { countryName: "Chile", MinimumLength: 11, MaximumLength: 13 },
    { countryName: "Guyana", MinimumLength: 10, MaximumLength: 10 },
  ];

  async function handleChange(e) {
    let { name, value } = e.target;

    if (name === "countryName") {
      setShowAutoComplete("showAutoComplete");
    }

    if (name === "inputNumber") {
      const countrySelected = countries.find(
        (country) => country.countryName === state.countryName
      );

      value = value.replaceAll(" ", "")
      if (countrySelected) {
        const valid =
          value.length >= countrySelected.MinimumLength &&
          value.length <= countrySelected.MaximumLength;

        setIsPhoneValid(valid);

        if (valid) {
          dispatch({ type: "FIELD_CHANGE", name, value });

          setOperators([]);
          setValues({});

          try {
            setLoad(true);
            const responseOperators = await RequestApi(
              `topup/providers?AccountNumber=${value}`,
              "GET",
              {},
              user
            );
            if (!responseOperators.success) {
              alert(responseOperators.message);
              return;
            }

            setOperators(responseOperators.Items || []);
            return;
          } catch (error) {
            alert(error.message);
          } finally {
            setLoad(false);
          }
        }
      }

      setIsPhoneValid(false);
    }

    dispatch({ type: "FIELD_CHANGE", name, value });
  }

  async function handleOperatorChange(e) {
    const selectedOperatorName = e.target.value;

    dispatch({
      type: "FIELD_CHANGE",
      name: "operatorName",
      value: selectedOperatorName,
    });

    const selectedOp = operators.find((op) => op.Name === selectedOperatorName);
    if (!selectedOp) return;

    const code = selectedOp.ProviderCode;
    setCountryIso(selectedOp.CountryIso);

    try {
      setLoad(true);
      const responseValues = await RequestApi(
        `topup/products?AccountNumber=${state.inputNumber}&ProviderCodes=${code}`,
        "GET",
        {},
        user
      );

      const nums = {};
      const items = Object.values(responseValues?.Items?.[code]) || [];

      if (items.length > 0) {
        const item = items[0];

        const minval = Number(item.minValue);
        const maxval = Number(item.maxValue);

        if (!isNaN(minval) && minval < maxval) {
          const sku = item.skuCode;
          for (let i = minval; i <= maxval; i++) {
            nums[i] = sku;
          }
        } else {
          items.forEach((val) => {
            nums[val.sendValue] = val.skuCode;
          });
        }
      }
      setValues(nums);
    } catch (error) {
      console.log(error.message);
      alert("Try again later", error.message);
    } finally {
      setLoad(false);
    }
  }

  function handleClickCountry(e) {
    const selectedCountry = e.target.textContent;
    setShowAutoComplete("hideAutoComplete");

    dispatch({
      type: "FIELD_CHANGE",
      name: "countryName",
      value: selectedCountry,
    });

    dispatch({ type: "RESET_FIELDS" });
    setIsPhoneValid(false);
    setOperators([]);
    setValues({});
  }

  async function handleChangeValueClick(e) {
    const value = e.target.value;
    const selectedSkuCode = values[value];
    setSkuCode(selectedSkuCode);

    const dataTopUp = {
      countryName: state.countryName,
      operatorName: state.operatorName,
      skuCode: selectedSkuCode,
      sendCurrencyIso: user.currencyIso,
      sendValue: value,
      receiveCurrencyIso: countryIso,
      accountNumber: state.inputNumber,
      transactionType: "topup",
      validateOnly: Boolean(false),
    };

    dispatch({
      type: "FIELD_CHANGE",
      name: "valueSelected",
      value,
    });

    try {
      setLoad(true);
      const response = await RequestApi(
        `topup/create-topup`,
        "POST",
        dataTopUp,
        user
      );

      if (response.success) {
        setEstimated(response.data.amountReceived);
      } else {
        alert("Failed to estimate top-up");
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoad(false);
    }
  }

  async function handleSubmit(e) {
    let dataTopUp
    e.preventDefault();
    if (
      !state.countryName ||
      !isPhoneValid ||
      !state.inputNumber ||
      !state.operatorName ||
      !state.valueSelected
    ) {
      alert("Please fill in all fields correctly.");
      return;
    }

    try {
      dataTopUp = {
        countryName: state.countryName,
        operatorName: state.operatorName,
        skuCode,
        sendCurrencyIso: user.currencyIso,
        sendValue: state.valueSelected,
        receiveCurrencyIso: countryIso,
        accountNumber: state.inputNumber,
        transactionType: "topup",
        validateOnly: true,
      };
      setLoad(true);
      const response = await RequestApi(
        `topup/create-topup`,
        "POST",
        dataTopUp,
        user
      );

      if (response.success) {
        setEstimated(response.data.amountReceived);
        setTransferId(response.data.transferId);
        setStatusTransaction(response.data.statusTransaction);
        setShowInvoice(dataTopUp.validateOnly);
      } else {
        alert("Failed to estimate top-up");
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoad(false);
    }

    if (dataTopUp.validateOnly) {
      return;
    }
    dispatch({ type: "RESET_FIELDS" });
    setOperators([]);
    setValues({});
    setIsPhoneValid(false);
    setSkuCode(null);
    setEstimated(0);
  }

  return (
    <div className="container-home">
      <Sidebar />
      <div className="box-central">
        <Navbar />
        <form className="box-topup" onSubmit={handleSubmit}>
          <h1>Send TopUp</h1>

          {/* Country Input */}
          <div className="box-countries box-input">
            <input
              type="text"
              name="countryName"
              id="countryName"
              placeholder="Country"
              onChange={handleChange}
              value={state.countryName}
              autoComplete="off"
            />
          </div>

          {/* Autocomplete */}
          <div className={`box-autocomplete ${showAutoComplete}`}>
            {countries
              .filter((country) =>
                country.countryName
                  .toLowerCase()
                  .includes(state.countryName.toLowerCase())
              )
              .map((country) => (
                <p key={country.countryName} onClick={handleClickCountry}>
                  {country.countryName}
                </p>
              ))}
            {countries.filter((country) =>
              country.countryName
                .toLowerCase()
                .includes(state.countryName.toLowerCase())
            ).length === 0 && <p>No country found</p>}
          </div>

          {/* Phone Number */}
          <div className="box-input">
            <input
              type="tel"
              name="inputNumber"
              id="inputNumber"
              value={state.inputNumber}
              onChange={handleChange}
              placeholder="Phone number"
            />
            {state.inputNumber && !isPhoneValid && (
              <p className="error">Phone invalid!</p>
            )}
          </div>

          {/* Operator */}
          <div className="box-input">
            <select
              name="operatorName"
              id="operatorName"
              value={state.operatorName}
              disabled={operators.length === 0}
              onChange={handleOperatorChange}
            >
              <option value="" disabled>
                {operators.length === 0
                  ? "No operators available"
                  : "Select operator"}
              </option>
              {operators.map((op) => (
                <option key={op.ProviderCode} value={op.Name}>
                  {op.Name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="box-input">
            <select
              name="valueSelected"
              id="valueSelected"
              value={state.valueSelected}
              disabled={Object.keys(values).length === 0}
              onChange={handleChangeValueClick}
            >
              <option value="" disabled>
                {Object.keys(values).length === 0
                  ? "No values available"
                  : "Select value"}
              </option>
              {Object.keys(values).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          <p>
            Estimated: {countryIso} {estimated}
          </p>

          {/* Submit */}
          <div className="box-input">
            <button type="submit">Send TopUp</button>
          </div>
        </form>
      </div>
      {load && <Load />}

      {showInvoice && (
        <div className="box-invoice">
          <Invoice
            onClose={() => setShowInvoice(false)}
            amount={state.valueSelected}
            amountReceived={estimated}
            operatorName={state.operatorName}
            accountNumber={state.inputNumber}
            countryName={state.countryName}
            statusTransaction={statusTransaction}
            dateNow={new Date().toLocaleString("pt-br")}
            transactionId={transferId}
            sendCurrencyIso={user.currencyIso}
            receiveCurrencyIso={countryIso}
          />
        </div>
      )}
    </div>
  );
}
