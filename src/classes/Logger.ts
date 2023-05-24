import chalk from 'chalk';

/** Logger Util */
export default class Logger {
  /** The Logger the Logger is using to Log */
  public logger: Console = console;

  /** The Identifier of the Logger */
  public identifier: string;

  /**
   * Logger Util
   * @param identifier The Identifier of the Logger
   */
  constructor(identifier: string) {
    this.identifier = identifier;
  }

  /** Send a Log Message */
  public log(...args: any[]): void {
    this.logger.log(chalk.bgBlueBright.bold.white(' LOG '), chalk.bgBlueBright.black(` ${this.identifier} `), ...args);
  }

  /** Send a Warn Message */
  public warn(...args: any[]): void {
    this.logger.warn(chalk.bgYellow.bold.black(' WARN '), chalk.bgBlueBright.black(` ${this.identifier} `), ...args);
  }

  /** Send an Error Message */
  public error(...args: any[]): void {
    this.logger.error(chalk.bgRed.bold.white(' ERROR '), chalk.bgBlueBright.black(` ${this.identifier} `), ...args);
  }

  /** Send a Debug Message */
  public debug(...args: any[]): void {
    this.logger.debug(chalk.bgGreen.bold.white(' DEBUG '), chalk.bgBlueBright.black(` ${this.identifier} `), ...args);
  }
}
