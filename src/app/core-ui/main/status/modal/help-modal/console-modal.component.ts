import {
  Component,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { Log } from 'ng2-logger';

import { DateFormatter } from '../../../../../core/util/utils';
import { RpcService, RpcStateService } from '../../../../../core';

import { SnackbarService } from '../../../../../core/snackbar/snackbar.service';
import { Command } from './command.model';

@Component({
  selector: 'app-console-modal',
  templateUrl: './console-modal.component.html',
  styleUrls: ['./console-modal.component.scss']
})
export class ConsoleModalComponent implements OnInit, AfterViewChecked {

  @ViewChild('debug') private commandContainer: ElementRef;
  log: any = Log.create('app-console-modal');

  public commandList: Command[] = [];
  public commandHistory: Array<string> = [];
  public command: string;
  public currentTime: string;
  public disableScrollDown: boolean = false;
  public waitingForRPC: boolean = true;
  public historyCount: number = 0;

  constructor(private _rpc: RpcService,
              private _rpcState: RpcStateService,
              private dialog: MatDialogRef<ConsoleModalComponent>,
              private snackbar: SnackbarService) {
  }

  ngOnInit() {
    this.getCurrentTime();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  pushCommandToHistory(cmd: string) {
    this.commandHistory.push(cmd);
    this.historyCount = this.commandHistory.length;
  };

    checkpart( part: any) {
        if (part === 'true') {
            return true;
        } else if (part === 'false') {
            return false;
        } else {
            const val = parseFloat(part);
            if (isNaN(val)) {
                return part
            } else {
                return val;
            }
        }
    };

    commandParse(command: string, parts: any[]) {
        const sp = command.indexOf(' ');
        const dq = command.indexOf('\"');
        const sq = command.indexOf('\'');
        const vals = [];
        let check_part = '';
        if (sp >= 0) {
            vals.push(sp);
        }
        if (dq >= 0) {
            vals.push(dq);
        }
        if (sq >= 0) {
            vals.push(sq);
        }
        if (vals.length === 0) {
            check_part = this.checkpart(command);
            parts.push(check_part);
            return '';
        }
        const subfar = Math.min(...vals);
        const part = command.substring(0, subfar);
        const rest = command.substring(subfar + 1);
        if (subfar === sp) {
            check_part = this.checkpart(part); // if it's wrapped in spaces it might be a bool or a number
            parts.push(check_part);
            return rest
        } else if ( subfar === dq ) {
            if (subfar === 0) {
                const nextfar = rest.indexOf('\"');
                if (nextfar < 0) {
                    throw new Error('unsupported command');
                } else if (nextfar + 1 === rest.length) {
                    const pushpart = rest.substring(0, nextfar);
                    parts.push(pushpart);
                    return '';
                } else {
                    const pushpart = rest.substring(0, nextfar);
                    parts.push(pushpart);
                    return rest.substring(nextfar + 1).trim();
                }
            } else {
                throw new Error('unsupported command');
            }
        } else if ( subfar === sq) {  // a single quote in the string will be alright, not sure about more than one.
            if (subfar === 0) {
                const nextfar = rest.indexOf('\'');
                if (nextfar < 0){
                    throw new Error('unsupported command');
                } else if (nextfar + 1 === rest.length) {
                    parts.push(rest.substring(0, nextfar));
                    return '';
                } else {
                    parts.push(rest.substring(0, nextfar));
                    return rest.substring(nextfar +1).trim();
                }
            } else {
                throw new Error('unsupported command');
            }
        } else {
            throw new Error('unsupported command');
        }
    }

    rpcCall() {
        this.waitingForRPC = false;
        // get the command and the arguments array.
        const parts = [];
        let text = this.command.trim();
        let keeprunning = true;
        while (keeprunning) {
            try {
                const new_text = this.commandParse(text, parts);
                text = new_text;
            } catch (e) {
                console.error('commandParse() error.message: ' + e.message);
                keeprunning = false;
            }
            if (text === '') {
                keeprunning = false
            }
        }
        this.command = parts[0];
        this.pushCommandToHistory(this.command);
        const params = [];
        for (let i = 1; i < parts.length; ++i) {
            params.push(parts[i]);
        }
        this._rpc.call(this.command, params)
            .subscribe(
                response => this.formatSuccessResponse(response),
                error => this.formatErrorResponse(error));
    }

  formatSuccessResponse(response: any) {
    this.waitingForRPC = true;
    this.commandList.push(new Command(1, this.command, this.getDateFormat()),
      new Command(2, response, this.getDateFormat(), 200));
    this.command = '';
    this.scrollToBottom();
  }

  formatErrorResponse(error: any) {
    this.waitingForRPC = true;
    if (error.code === -1) {
      this.commandList.push(new Command(1, this.command, this.getDateFormat()),
        new Command(2, error.message, this.getDateFormat(), -1));
      this.command = '';
      this.scrollToBottom();
    } else {
      const erroMessage = (error.message) ? error.message : 'Method not found';
      this.snackbar.open(erroMessage);
    }
  }

  isJson(text: any) {
    return (typeof text === 'object');
  }

  clearCommands() {
    this.commandList = [];
  }

  /* Time stuff */

  getCurrentTime() {
    this.currentTime = this.getDateFormat();
  }

  getDateFormat() {
    return new DateFormatter(new Date()).hourSecFormatter();
  }

  scrollToBottom() {
    if (this.disableScrollDown) {
      return
    }
    this.commandContainer.nativeElement.scrollTop = this.commandContainer.nativeElement.scrollHeight;
  }

  onScroll() {
    const element = this.commandContainer.nativeElement
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight
    if (this.disableScrollDown && atBottom) {
      this.disableScrollDown = false
    } else {
      this.disableScrollDown = true
    }
  }

  manageCommandHistory(code: number) {
    if (code === 38) {
      if (this.historyCount > 0) {
        this.historyCount--;
      }
    } else {
      if (this.historyCount <= this.commandHistory.length) {
        this.historyCount++;
      }
    }
    this.command = this.commandHistory[this.historyCount];
  }

  // capture the enter button
  @HostListener('window:keydown', ['$event'])
  keyDownEvent(event: any) {
    if ([13, 38, 40].includes(event.keyCode)) {
      event.preventDefault();
    }
    if (event.keyCode === 13 && this.command && this.waitingForRPC) {
      this.disableScrollDown = false;
      this.rpcCall();
    } else if (event.ctrlKey && event.keyCode === 76) {
      this.clearCommands();
      // Up and Down arrow KeyPress to manage command history
    } else if ([38, 40].includes(event.keyCode) && this.commandHistory.length > 0) {
      this.manageCommandHistory(event.keyCode);
    }
  }

  close(): void {
    this.dialog.close();
  }

}
