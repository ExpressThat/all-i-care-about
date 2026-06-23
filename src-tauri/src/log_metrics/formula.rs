use std::collections::BTreeMap;

pub fn evaluate_formula(formula: &str, variables: &BTreeMap<String, f64>) -> Result<f64, String> {
    let mut parser = Parser {
        chars: formula.chars().collect(),
        index: 0,
        variables,
    };
    let value = parser.expression()?;
    parser.skip_whitespace();
    if parser.index < parser.chars.len() {
        return Err("Formula contains unexpected trailing characters.".to_string());
    }
    if value.is_finite() {
        Ok(value)
    } else {
        Err("Formula produced a non-finite value.".to_string())
    }
}

struct Parser<'a> {
    chars: Vec<char>,
    index: usize,
    variables: &'a BTreeMap<String, f64>,
}

impl Parser<'_> {
    fn expression(&mut self) -> Result<f64, String> {
        let mut value = self.term()?;
        loop {
            self.skip_whitespace();
            if self.consume('+') {
                value += self.term()?;
            } else if self.consume('-') {
                value -= self.term()?;
            } else {
                return Ok(value);
            }
        }
    }

    fn term(&mut self) -> Result<f64, String> {
        let mut value = self.factor()?;
        loop {
            self.skip_whitespace();
            if self.consume('*') {
                value *= self.factor()?;
            } else if self.consume('/') {
                value /= self.factor()?;
            } else {
                return Ok(value);
            }
        }
    }

    fn factor(&mut self) -> Result<f64, String> {
        self.skip_whitespace();
        if self.consume('(') {
            let value = self.expression()?;
            self.skip_whitespace();
            if !self.consume(')') {
                return Err("Formula is missing a closing parenthesis.".to_string());
            }
            return Ok(value);
        }
        if self.consume('-') {
            return Ok(-self.factor()?);
        }
        if self.peek().is_some_and(|value| value.is_ascii_digit() || value == '.') {
            return self.number();
        }
        self.variable()
    }

    fn number(&mut self) -> Result<f64, String> {
        let start = self.index;
        while self
            .peek()
            .is_some_and(|value| value.is_ascii_digit() || value == '.')
        {
            self.index += 1;
        }
        self.chars[start..self.index]
            .iter()
            .collect::<String>()
            .parse::<f64>()
            .map_err(|error| format!("Invalid number in formula: {error}"))
    }

    fn variable(&mut self) -> Result<f64, String> {
        let start = self.index;
        while self
            .peek()
            .is_some_and(|value| value.is_ascii_alphanumeric() || value == '_')
        {
            self.index += 1;
        }
        if start == self.index {
            return Err("Formula expected a number, variable, or parenthesis.".to_string());
        }
        let name = self.chars[start..self.index].iter().collect::<String>();
        self.variables
            .get(&name)
            .copied()
            .ok_or_else(|| format!("Formula references unknown query id: {name}"))
    }

    fn consume(&mut self, expected: char) -> bool {
        if self.peek() == Some(expected) {
            self.index += 1;
            return true;
        }
        false
    }

    fn peek(&self) -> Option<char> {
        self.chars.get(self.index).copied()
    }

    fn skip_whitespace(&mut self) {
        while self.peek().is_some_and(char::is_whitespace) {
            self.index += 1;
        }
    }
}
