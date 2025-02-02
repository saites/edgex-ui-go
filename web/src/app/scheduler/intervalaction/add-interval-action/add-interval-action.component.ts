/*******************************************************************************
 * Copyright © 2021-2022 VMware, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 * 
 * @author: Huaqiao Zhang, <huaqiaoz@vmware.com>
 *******************************************************************************/

import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { SchedulerService } from '../../../services/scheduler.service';
import { MessageService } from '../../../message/message.service';
import { ErrorService } from '../../../services/error.service';
import { Address } from '../../../contracts/v2/address';

import { IntervalAction } from '../../../contracts/v2/interval-action';
import { Interval } from '../../../contracts/v2/interval';
import { CoreCommand } from '../../../contracts/v2/core-command';
import { CoreCommandParameter } from '../../../contracts/v2/core-command';
import flatpickr from 'flatpickr';

@Component({
  selector: 'app-add-interval-action',
  templateUrl: './add-interval-action.component.html',
  styleUrls: ['./add-interval-action.component.css']
})
export class AddIntervalActionComponent implements OnInit {

  addr_type_REST: string = 'REST';
  addr_type_MQTT: string = 'MQTT';
  addr_type_EMAIL: string = 'EMAIL';

  template_type_coredata = 'coredata';
  template_type_command = 'command';
  template_type_custom = 'custom';

  intervalAction: IntervalAction;
  addressEmailRecipients: string = "";
  templateSelected: string = "coredata";
  coredataRequestParameter = '';
  commandServiceTemplateRequestParameters: CoreCommandParameter[] = [];
  pushEventOfGetCmdParamter = "yes";
  returnEventOfGetCmdParamter = "yes";
  calendarStart: any;

  coredataSvcAvailableAPI: string[] = [
    "/api/v2/event/age/"
  ];

  constructor(private schedulerSvc:SchedulerService, 
    private msgSvc: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private errorSvc: ErrorService) { 
      this.intervalAction = { adminState: 'UNLOCKED' } as IntervalAction;
      this.intervalAction.address = {} as Address;
      this.intervalAction.address.type = 'REST';
      this.intervalAction.address.httpMethod = 'GET';
      this.intervalAction.address.retained = false;
      this.intervalAction.address.autoReconnect = true;
    }

  ngOnInit(): void {
    this.renderPopoverComponent();
    this.renderCoredataDefaultTemplate();
  }

  initDatePickr() {
    let that = this;
    this.calendarStart = flatpickr("input[name='coredataRequestParameter']", {
      dateFormat: "YmdTHiS",
      enableTime: true,
      enableSeconds: true,
      time_24hr: true,
      allowInput: false,
      onChange: function(selectedDates, dateStr, instance) {
          that.intervalAction.address.path = that.coredataSvcAvailableAPI[0] + dateStr;
      },
    });
  }

  renderPopoverComponent() {
    $('[data-toggle="popover"]').popover({
      trigger: 'hover'
    });
  }

  renderCoredataDefaultTemplate() {
    this.intervalAction.address.httpMethod = 'DELETE';
    this.intervalAction.address.host = 'edgex-core-data';
    this.intervalAction.address.port = 59880;
    this.intervalAction.address.path = this.coredataSvcAvailableAPI[0];
    setTimeout(() => {
      this.renderPopoverComponent();
      this.initDatePickr();
    }, 300);
  }

  templateToggle(template: string) {
    this.templateSelected = template;
    switch (this.templateSelected) {
      case this.template_type_coredata:
        this.renderCoredataDefaultTemplate();
        break;
      case this.template_type_command:
        this.intervalAction.address.httpMethod = '';
        this.intervalAction.address.host = 'edgex-core-command';
        this.intervalAction.address.port = 59882;
        this.intervalAction.address.path = '';
        this.intervalAction.address.httpMethod = '';
        setTimeout(() => {
          this.renderPopoverComponent();
        }, 300); 
        break;
      case this.template_type_custom:
        setTimeout(() => {
          this.renderPopoverComponent();
        }, 300); 
        this.intervalAction.address = {} as Address;
        this.intervalAction.address.type = 'REST';
        this.intervalAction.address.httpMethod = 'GET';
        this.intervalAction.address.retained = false;
        this.intervalAction.address.autoReconnect = true;
    }
  }

  typeToggle(type: string) {
    this.intervalAction.address.type = type;
    if (type === 'REST') {
      this.templateToggle('coredata');
    }
  }

  onCmdMethodSelected(method: string) {
    this.intervalAction.address.httpMethod = method;
    setTimeout(() => {
      this.renderPopoverComponent();
    }, 500);
  }

  onCommandSelected(cmd: CoreCommand) {
    this.intervalAction.address.path = cmd.path;
    this.commandServiceTemplateRequestParameters = cmd.parameters;
  }

  onSingleIntervalSelected(interval: Interval) {
    this.intervalAction.intervalName = interval.name;
  }

  isPureIntegerType(value: any): boolean {
    if (!isNaN(value) && (parseFloat(value) === parseInt(value))) {
      return true
    }
    return false
  }

  validate(): boolean {
    let result = true;
    let basic =  this.intervalAction.name && this.intervalAction.intervalName; 
    switch (this.intervalAction.address.type) {
      case this.addr_type_REST:
        if (basic && this.intervalAction.address.host && 
          this.isPureIntegerType(this.intervalAction.address.port) &&
          // this.intervalAction.address.port &&  // if the value of port is 0 will not be passed
          this.intervalAction.address.path && 
          this.intervalAction.address.httpMethod) {
            result = false
        }
        break
      case this.addr_type_MQTT: 
        if (basic && this.intervalAction.address.host && 
          this.isPureIntegerType(this.intervalAction.address.port) &&
          // this.intervalAction.address.port && // if the value of port is 0 will not be passed
          this.intervalAction.address.publisher &&
          this.intervalAction.address.topic) {
            result = false
        }
        break
      case this.addr_type_EMAIL:
        if (basic) {
          result = false
        }
    }
    return result
  }

  getAllCmdTemplateParametersValue(): string {
    if (this.intervalAction.address.type !== this.addr_type_REST ||
      this.templateSelected !== this.template_type_command) {
      return '';
    }
    if (this.intervalAction.address.httpMethod == 'GET') return '';
    let params: any = {};
    this.commandServiceTemplateRequestParameters?.forEach(p => {
      if ($(`#cmd-param-${p.resourceName}`).val().trim() !== "") {
        params[p.resourceName] = $(`#cmd-param-${p.resourceName}`).val().trim();
      }
    });
    return JSON.stringify(params)
  }

  resetPathParameterSuffix() {
    if (this.intervalAction.address.path.indexOf('ds-pushevent') !== -1 ||  
        this.intervalAction.address.path.indexOf('ds-returnevent') !== -1) {
        this.intervalAction.address.path = this.intervalAction.address.path.split('?')[0];
    }
    this.intervalAction.address.path = `${this.intervalAction.address.path}?ds-pushevent=${this.pushEventOfGetCmdParamter}&ds-returnevent=${this.returnEventOfGetCmdParamter}`;
  }

  submit() {
    this.intervalAction.address.recipients = this.addressEmailRecipients.split(',');
    this.intervalAction.address.port = Number(this.intervalAction.address.port);

    if (this.intervalAction.address.type === this.addr_type_REST &&
        this.templateSelected === this.template_type_command) {
          if (this.intervalAction.address.httpMethod === 'GET') {
            this.resetPathParameterSuffix()
          } else if (this.intervalAction.address.httpMethod === 'PUT') {
            this.intervalAction.content = this.getAllCmdTemplateParametersValue();
          }
    }

    this.schedulerSvc.addIntervalAction(this.intervalAction).subscribe((resp: any) => {
      if(this.errorSvc.handleErrorForV2API(resp)) {
        return
      }
      this.msgSvc.success('Add interval action',`name: ${this.intervalAction.name}`);
      this.router.navigate(['../interval-action-list'],{ relativeTo: this.route });
    })
  }
}
