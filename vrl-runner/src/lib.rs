// Adapted from `vector-vrl-web-playground` (vectordotdev/vector, MPL-2.0).
// Trimmed to use only the VRL stdlib (no Vector-specific functions).
use std::collections::BTreeMap;

use gloo_utils::format::JsValueSerdeExt;
use serde::{Deserialize, Serialize};
use vrl::{
    compiler::{
        compile_with_state, runtime::{Runtime, Terminate},
        CompileConfig, TargetValue, TimeZone, TypeState,
    },
    diagnostic::{DiagnosticList, Formatter},
    value::{Secrets, Value},
};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct Input {
    pub program: String,
    pub event: Value,
}

#[derive(Deserialize, Serialize)]
pub struct VrlCompileResult {
    pub runtime_result: Value,
    pub target_value: Value,
    pub elapsed_time: Option<f64>,
}

#[derive(Deserialize, Serialize, Default)]
pub struct VrlDiagnosticResult {
    pub list: Vec<String>,
    pub msg: String,
    pub msg_colorized: String,
}

impl VrlDiagnosticResult {
    fn new(program: &str, diagnostic_list: DiagnosticList) -> Self {
        Self {
            list: diagnostic_list
                .clone()
                .into_iter()
                .map(|diag| String::from(diag.message()))
                .collect(),
            msg: Formatter::new(program, diagnostic_list.clone()).to_string(),
            msg_colorized: Formatter::new(program, diagnostic_list)
                .colored()
                .to_string(),
        }
    }

    fn new_runtime_error(program: &str, terminate: Terminate) -> Self {
        Self {
            list: Vec::with_capacity(1),
            msg: Formatter::new(program, terminate.clone().get_expression_error()).to_string(),
            msg_colorized: Formatter::new(program, terminate.get_expression_error())
                .colored()
                .to_string(),
        }
    }
}

fn compile(
    mut input: Input,
    tz_str: Option<String>,
) -> Result<VrlCompileResult, VrlDiagnosticResult> {
    let functions = vrl::stdlib::all();

    let event = &mut input.event;
    let state = TypeState::default();
    let mut runtime = Runtime::default();
    let config = CompileConfig::default();

    let timezone = match tz_str.as_deref() {
        None | Some("") | Some("Default") => TimeZone::default(),
        Some(other) => match other.parse() {
            Ok(tz) => TimeZone::Named(tz),
            Err(_) => {
                let msg = format!("Invalid timezone identifier: '{other}'");
                return Err(VrlDiagnosticResult {
                    list: vec![msg.clone()],
                    msg: msg.clone(),
                    msg_colorized: msg,
                });
            }
        },
    };

    let mut target_value = TargetValue {
        value: event.clone(),
        metadata: Value::Object(BTreeMap::new()),
        secrets: Secrets::new(),
    };

    let compilation_result = match compile_with_state(&input.program, &functions, &state, config) {
        Ok(result) => result,
        Err(diagnostics) => return Err(VrlDiagnosticResult::new(&input.program, diagnostics)),
    };

    let (result, elapsed_time) =
        if let Some(performance) = web_sys::window().and_then(|w| w.performance()) {
            let start = performance.now();
            let r = runtime.resolve(&mut target_value, &compilation_result.program, &timezone);
            let end = performance.now();
            (r, Some(end - start))
        } else {
            let r = runtime.resolve(&mut target_value, &compilation_result.program, &timezone);
            (r, None)
        };

    match result {
        Ok(runtime_result) => Ok(VrlCompileResult {
            runtime_result,
            target_value: target_value.value,
            elapsed_time,
        }),
        Err(err) => Err(VrlDiagnosticResult::new_runtime_error(&input.program, err)),
    }
}

#[wasm_bindgen]
pub fn run_vrl(incoming: &JsValue, tz_str: &str) -> JsValue {
    let input: Input = match incoming.into_serde() {
        Ok(v) => v,
        Err(e) => {
            let msg = format!("Invalid input: {e}");
            let err = VrlDiagnosticResult {
                list: vec![msg.clone()],
                msg: msg.clone(),
                msg_colorized: msg,
            };
            return JsValue::from_serde(&err).unwrap();
        }
    };

    match compile(input, Some(tz_str.to_string())) {
        Ok(res) => JsValue::from_serde(&res).unwrap(),
        Err(err) => JsValue::from_serde(&err).unwrap(),
    }
}
